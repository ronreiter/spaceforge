import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppShell, Tabs, Box } from '@mantine/core';
import { IconEye, IconLayoutGrid, IconEdit } from '@tabler/icons-react';
import { BrowserGate } from './ui/BrowserGate';
import { TopBar } from './ui/TopBar';
import { Chat, type ChatSendState } from './ui/Chat';
import { Preview } from './ui/Preview';
import { Templates } from './ui/Templates';
import { EditorView } from './ui/EditorView';
import {
  loadSite,
  saveSite,
  writeFile,
  deleteFile,
  clearSite,
  emptySite,
  setTemplate,
  type SiteState,
  type ChatMessage,
} from './storage/files';
import { buildZip, triggerDownload } from './storage/zip';
import { overlayFiles } from './templates/registry';
import { loadModel, type Generator, type ProgressInfo } from './model/loader';
import { runGeneration } from './model/generate';
import { stripCodeFences } from './parser/stripCodeFences';

// Heuristic: after the model hits EOS mid-stream the parser emits
// file-truncated, but the body often ends with a perfectly good closing
// (</html>, trailing } on a css block). When it does we save silently
// without the "cut off" warning — the user's preview just works.
function looksComplete(path: string, body: string): boolean {
  const trimmed = body.replace(/\s+$/, '');
  if (!trimmed) return false;
  const ext = path.toLowerCase().split('.').pop() ?? '';
  if (ext === 'html' || ext === 'htm') return /<\/html>\s*$/i.test(trimmed);
  if (ext === 'css') return trimmed.endsWith('}');
  if (ext === 'js' || ext === 'mjs' || ext === 'ts' || ext === 'tsx') {
    return /[};)]\s*$/.test(trimmed);
  }
  if (ext === 'json') return /[}\]]\s*$/.test(trimmed);
  if (ext === 'svg') return /<\/svg>\s*$/i.test(trimmed);
  // Unknown extension: trust it if it's non-trivial.
  return trimmed.length > 40;
}
import {
  DEFAULT_MODEL_ID,
  MODEL_STORAGE_KEY,
  getModel,
  fallbackEntry,
} from './model/registry';

import { useServerSite } from './storage/useServerSite';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAlert, useConfirm } from './ui/dialogs';

type StatusKind = 'loading' | 'ready' | 'error';

export type SiteChrome = {
  // Multi-tenant site context surfaced in the TopBar. None of these are
  // required for the editor to work; they just let the TopBar show the
  // back-to-dashboard link, site name, publish controls, etc.
  siteId?: string;
  siteName?: string;
  siteSlug?: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  publishedAt?: string | null;
  publishedVersionId?: string | null;
  dashboardHref?: string;
  publishing?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  // Called after a rollback so the host can refresh publishedAt +
  // publishedVersionId without a page reload.
  onVersionChanged?: (publishedAt: string, versionId: string) => void;
};

export type AppProps = {
  // When provided, the editor loads/saves through /api/sites/:id/files.
  // When absent, falls back to the single-browser localStorage store
  // (used for tests and anywhere the editor runs without a site route).
  siteId?: string;
  chrome?: SiteChrome;
};

export default function App(props: AppProps = {}) {
  return (
    <BrowserGate>
      <AppInner siteId={props.siteId} chrome={props.chrome} />
    </BrowserGate>
  );
}

// Legacy single-browser store (localStorage-backed). Used when the
// editor is instantiated without a siteId — kept so the old tests and
// any embed-without-routing paths still work.
function useLocalSite(): [SiteState, React.Dispatch<React.SetStateAction<SiteState>>] {
  const [site, setSite] = useState<SiteState>(() => loadSite());
  useEffect(() => {
    saveSite(site);
  }, [site]);
  return [site, setSite];
}

function AppInner({ siteId, chrome }: { siteId?: string; chrome?: SiteChrome }) {
  if (siteId) {
    return <AppInnerServerSite siteId={siteId} chrome={chrome} />;
  }
  return <AppInnerLocalSite />;
}

function AppInnerServerSite({
  siteId,
  chrome,
}: {
  siteId: string;
  chrome?: SiteChrome;
}) {
  const { status, site, setSite, error, saving, lastSavedAt } =
    useServerSite(siteId);
  if (status === 'loading' || !site) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="xs">
          <Loader size="sm" />
          <Text c="dimmed" size="sm">
            Loading site…
          </Text>
        </Stack>
      </Center>
    );
  }
  if (status === 'error') {
    return (
      <Center h="100vh" p="xl">
        <Stack align="center" gap="xs">
          <Text c="red" size="sm">
            Failed to load site: {error}
          </Text>
        </Stack>
      </Center>
    );
  }
  return (
    <AppInnerBody
      site={site}
      setSite={setSite}
      saving={saving}
      lastSavedAt={lastSavedAt}
      chrome={chrome}
    />
  );
}

function AppInnerLocalSite() {
  const [site, setSite] = useLocalSite();
  return <AppInnerBody site={site} setSite={setSite} saving={false} lastSavedAt={null} />;
}

function AppInnerBody({
  site,
  setSite,
  saving,
  lastSavedAt,
  chrome,
}: {
  site: SiteState;
  setSite: (updater: SiteState | ((s: SiteState) => SiteState)) => void;
  saving: boolean;
  lastSavedAt: number | null;
  chrome?: SiteChrome;
}) {
  // Viewer-role collaborators can browse but not mutate. The API layer
  // enforces this too (PUT/DELETE return 403); this makes the UX honest.
  const readOnly = chrome?.role === 'viewer';

  const confirmDialog = useConfirm();
  const alertDialog = useAlert();

  const [tab, setTab] = useState<'preview' | 'edit' | 'templates'>('preview');

  const previewFiles = useMemo(
    () => overlayFiles(site.files, site.templateId),
    [site.files, site.templateId],
  );

  const [modelId, setModelId] = useState<string>(
    () =>
      localStorage.getItem(MODEL_STORAGE_KEY) ||
      site.model ||
      DEFAULT_MODEL_ID,
  );
  const [generator, setGenerator] = useState<Generator | null>(null);
  const [status, setStatus] = useState<string>('Checking model…');
  const [statusKind, setStatusKind] = useState<StatusKind>('loading');
  const [progressPct, setProgressPct] = useState<number | undefined>(undefined);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tokensPerSec, setTps] = useState<number>(0);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);

  const fileBuffers = useRef<Record<string, string>>({});

  // Per-file progress aggregation. transformers.js emits one stream of progress
  // events per shard; we aggregate them so the bar reflects overall load.
  const fileProgress = useRef<Map<string, { loaded: number; total: number }>>(new Map());

  useEffect(() => {
    const entry = getModel(modelId) ?? fallbackEntry(modelId);
    localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    setStatusKind('loading');
    setStatus(`Loading ${entry.label}…`);
    setProgressPct(undefined);
    setGenerator(null);
    fileProgress.current = new Map();

    let cancelled = false;
    loadModel(entry, (p: ProgressInfo) => {
      if (cancelled) return;
      if (p.status === 'progress' && p.file && p.loaded !== undefined && p.total !== undefined) {
        fileProgress.current.set(p.file, { loaded: p.loaded, total: p.total });
        let loaded = 0;
        let total = 0;
        for (const { loaded: l, total: t } of fileProgress.current.values()) {
          loaded += l;
          total += t;
        }
        const pct = total > 0 ? (loaded / total) * 100 : 0;
        setProgressPct(pct);
        const mb = (loaded / (1024 * 1024)).toFixed(0);
        const totalMb = (total / (1024 * 1024)).toFixed(0);
        setStatus(`Downloading ${entry.label}: ${pct.toFixed(1)}% (${mb} / ${totalMb} MB)`);
      } else if (p.status === 'done' && p.file) {
        const entryProg = fileProgress.current.get(p.file);
        if (entryProg) entryProg.loaded = entryProg.total;
      } else if (p.status === 'ready') {
        setProgressPct(undefined);
        setStatus(`${entry.label} ready`);
      } else if (p.status === 'initiate' && p.file) {
        setStatus(`Initializing ${entry.label}…`);
      }
    })
      .then((g) => {
        if (cancelled) return;
        setGenerator(g);
        setStatusKind('ready');
        setStatus(`${entry.label} ready`);
        setProgressPct(undefined);
        setDownloaded((s) => {
          if (s.has(modelId)) return s;
          const next = new Set(s);
          next.add(modelId);
          return next;
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatusKind('error');
        setStatus(`Failed to load: ${err.message}`);
        setProgressPct(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [modelId]);

  useEffect(() => {
    setSite((s) => (s.model === modelId ? s : { ...s, model: modelId }));
  }, [modelId]);

  const runPrompt = useCallback(
    async (text: string) => {
      if (!generator) return;
      setBusy(true);

      const userMsg: ChatMessage = { role: 'user', content: text };
      const snapshot: SiteState = {
        ...site,
        chatHistory: [...site.chatHistory, userMsg],
      };

      setSite((s) => ({
        ...s,
        chatHistory: [...s.chatHistory, userMsg, { role: 'assistant', content: '' }],
      }));

      let tokens = 0;
      let filesTouched = 0;
      const t0 = performance.now();
      const tick = setInterval(() => {
        const sec = (performance.now() - t0) / 1000;
        setTps(sec > 0 ? tokens / sec : 0);
      }, 250);

      const entry = getModel(modelId) ?? fallbackEntry(modelId);

      await runGeneration(generator, entry, snapshot, text, {
        onProse: (chunk) => {
          tokens += chunk.length / 4;
          setSite((s) => {
            const h = [...s.chatHistory];
            const last = h[h.length - 1];
            if (last && last.role === 'assistant') {
              h[h.length - 1] = { ...last, content: last.content + chunk };
            }
            return { ...s, chatHistory: h };
          });
        },
        onFileStart: (path) => {
          fileBuffers.current[path] = '';
        },
        onFileChunk: (path, chunk) => {
          tokens += chunk.length / 4;
          fileBuffers.current[path] = (fileBuffers.current[path] ?? '') + chunk;
        },
        onFileEnd: (path) => {
          filesTouched += 1;
          const buf = stripCodeFences(fileBuffers.current[path] ?? '');
          delete fileBuffers.current[path];
          setSite((s) => {
            try {
              return writeFile(s, path, buf);
            } catch {
              return s;
            }
          });
        },
        onFileTruncated: (path) => {
          filesTouched += 1;
          const buf = stripCodeFences(fileBuffers.current[path] ?? '');
          delete fileBuffers.current[path];
          const complete = looksComplete(path, buf);
          setSite((s) => {
            const h = [...s.chatHistory];
            const last = h[h.length - 1];
            if (last && last.role === 'assistant' && !complete) {
              const note = buf
                ? `\n\n[file "${path}" was cut off — saved partial contents; ask me to finish it]`
                : `\n\n[file "${path}" was cut off before any content — ask me to try again]`;
              h[h.length - 1] = { ...last, content: last.content + note };
            }
            let next = { ...s, chatHistory: h };
            if (buf) {
              try {
                next = writeFile(next, path, buf);
              } catch {
                /* ignore invalid path */
              }
            }
            return next;
          });
        },
        onComplete: () => {
          setBusy(false);
          clearInterval(tick);
          setTps(0);
          // If the model produced prose but never emitted a ===FILE:=== block,
          // the site is unchanged. Tell the user explicitly so they know to
          // retry — small models sometimes stop at the planning step.
          if (filesTouched === 0) {
            setSite((s) => {
              const h = [...s.chatHistory];
              const last = h[h.length - 1];
              if (last && last.role === 'assistant') {
                const note =
                  '\n\n⚠️ I described the change but didn\'t write any files — nothing changed. Try asking again, rephrase more directly (e.g. "update index.md to add three landscape photos"), or switch to a larger model.';
                h[h.length - 1] = { ...last, content: last.content + note };
              }
              return { ...s, chatHistory: h };
            });
          }
        },
        onError: (err) => {
          setBusy(false);
          clearInterval(tick);
          setTps(0);
          setSite((s) => ({
            ...s,
            chatHistory: [
              ...s.chatHistory,
              { role: 'assistant', content: `Error: ${err.message}` },
            ],
          }));
        },
      });
    },
    [generator, modelId, site],
  );

  // Run queued prompt once the model becomes ready.
  useEffect(() => {
    if (queuedPrompt && statusKind === 'ready' && generator && !busy) {
      const prompt = queuedPrompt;
      setQueuedPrompt(null);
      runPrompt(prompt);
    }
  }, [queuedPrompt, statusKind, generator, busy, runPrompt]);

  function onSend(text: string) {
    if (busy) return;
    if (statusKind === 'ready' && generator) {
      runPrompt(text);
    } else {
      setQueuedPrompt(text);
    }
  }

  const onFileChange = (path: string, contents: string) =>
    setSite((s) => {
      try {
        return writeFile(s, path, contents);
      } catch {
        return s;
      }
    });
  const onFileDelete = (path: string) => setSite((s) => deleteFile(s, path));
  const onFileCreate = (path: string, contents: string) =>
    setSite((s) => {
      try {
        return writeFile(s, path, contents);
      } catch (e) {
        void alertDialog({
          title: 'Could not create file',
          message: e instanceof Error ? e.message : String(e),
        });
        return s;
      }
    });

  async function onDownloadZip() {
    const blob = await buildZip(site.files, site.templateId);
    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
    triggerDownload(blob, `spaceforge-site-${ts}.zip`);
  }

  const onSelectTemplate = (id: string) => setSite((s) => setTemplate(s, id));

  async function onStartFresh() {
    const ok = await confirmDialog({
      title: 'Start fresh?',
      message:
        'This wipes the current site and chat history. Download first if you want to keep it.',
      confirmLabel: 'Start fresh',
      cancelLabel: 'Keep editing',
      danger: true,
    });
    if (!ok) return;
    clearSite();
    const fresh = emptySite();
    fresh.model = modelId;
    setSite(fresh);
    setQueuedPrompt(null);
    fileBuffers.current = {};
  }

  const sendState: ChatSendState = busy
    ? 'generating'
    : queuedPrompt
    ? 'queued'
    : statusKind === 'ready'
    ? 'idle'
    : 'loading-model';

  const statusLine = busy
    ? 'Generating…'
    : queuedPrompt && statusKind === 'loading'
    ? 'Queued — will run when model is ready'
    : undefined;

  return (
    <AppShell
      header={{ height: 60 }}
      padding={0}
      styles={{ main: { height: '100vh', display: 'flex', flexDirection: 'column' } }}
    >
      <AppShell.Header>
        <TopBar
          modelId={modelId}
          downloaded={downloaded}
          onModelChange={setModelId}
          status={status}
          statusKind={statusKind}
          progressPct={progressPct}
          onDownloadZip={onDownloadZip}
          onStartFresh={onStartFresh}
          dashboardHref={chrome?.dashboardHref}
          siteId={chrome?.siteId}
          siteName={chrome?.siteName}
          siteSlug={chrome?.siteSlug}
          role={chrome?.role}
          publishedAt={chrome?.publishedAt}
          publishedVersionId={chrome?.publishedVersionId}
          publishing={chrome?.publishing}
          onPublish={chrome?.onPublish}
          onUnpublish={chrome?.onUnpublish}
          onVersionChanged={chrome?.onVersionChanged}
          saving={saving}
          lastSavedAt={lastSavedAt}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          <Box
            w={380}
            miw={300}
            style={{
              borderRight: '1px solid var(--mantine-color-default-border)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Chat
              messages={site.chatHistory}
              sendState={sendState}
              statusLine={statusLine}
              tokensPerSecond={tokensPerSec}
              queuedPrompt={queuedPrompt}
              onSend={onSend}
              onClearQueue={() => setQueuedPrompt(null)}
              readOnly={readOnly}
            />
          </Box>
          <Box
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <Tabs
              value={tab}
              onChange={(v) => v && setTab(v as 'preview' | 'edit' | 'templates')}
              variant="default"
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
              <Tabs.List>
                <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>
                  Preview
                </Tabs.Tab>
                <Tabs.Tab value="edit" leftSection={<IconEdit size={14} />}>
                  Edit
                </Tabs.Tab>
                <Tabs.Tab value="templates" leftSection={<IconLayoutGrid size={14} />}>
                  Template
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="preview" style={{ flex: 1, minHeight: 0 }}>
                <Preview files={previewFiles} />
              </Tabs.Panel>
              <Tabs.Panel value="edit" style={{ flex: 1, minHeight: 0 }}>
                <EditorView
                  files={site.files}
                  templateId={site.templateId}
                  onFileChange={onFileChange}
                  onFileCreate={onFileCreate}
                  onFileDelete={onFileDelete}
                  readOnly={readOnly}
                />
              </Tabs.Panel>
              <Tabs.Panel value="templates" style={{ flex: 1, minHeight: 0 }}>
                <Templates
                  templateId={site.templateId}
                  onSelect={onSelectTemplate}
                  readOnly={readOnly}
                />
              </Tabs.Panel>
            </Tabs>
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
