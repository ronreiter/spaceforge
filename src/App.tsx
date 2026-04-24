import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppShell, Box, Tabs } from '@mantine/core';
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
  // Identity for the top-bar user menu. Present only when the host
  // (SiteEditor) has an authenticated user — absent in the
  // localStorage-only tests.
  user?: { email: string; name: string | null };
  isDevAuth?: boolean;
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
  const { status, site, setSite, reload, error, saving, lastSavedAt } =
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
      onUploadAssets={async (files) => {
        const fd = new FormData();
        for (const f of files) fd.append('file', f);
        const res = await fetch(`/api/sites/${siteId}/upload`, {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        await reload();
      }}
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
  onUploadAssets,
}: {
  site: SiteState;
  setSite: (updater: SiteState | ((s: SiteState) => SiteState)) => void;
  saving: boolean;
  lastSavedAt: number | null;
  chrome?: SiteChrome;
  onUploadAssets?: (files: File[]) => Promise<void>;
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

  // Abort + watchdog state for the "stop generating" button and the
  // auto-retry-on-stall behaviour. See runPrompt below.
  const abortRef = useRef<AbortController | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTokenAtRef = useRef<number>(0);
  const retriesRef = useRef<number>(0);
  const lastPromptRef = useRef<string | null>(null);
  const STALL_MS = 45_000;
  const MAX_RETRIES = 2;

  function clearWatchdog() {
    if (watchdogRef.current !== null) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }

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
        setStatus(
          g.warning
            ? `${entry.label} ready (CPU fallback)`
            : `${entry.label} ready`,
        );
        setProgressPct(undefined);
        if (g.warning) {
          // Surface the fallback warning as a persistent status line
          // so the user knows why tokens will come out slowly.
          console.warn('[spaceforge]', g.warning);
        }
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
      lastPromptRef.current = text;

      // Abort any prior in-flight generation; set up a fresh controller.
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Watchdog: if no new token arrives within STALL_MS, assume the
      // WASM runtime hung, abort this attempt, and re-queue the prompt
      // for retry (up to MAX_RETRIES). After that the user has to step
      // in — either Stop or try a different model.
      lastTokenAtRef.current = Date.now();
      clearWatchdog();
      watchdogRef.current = setInterval(() => {
        if (controller.signal.aborted) return;
        if (Date.now() - lastTokenAtRef.current < STALL_MS) return;
        controller.abort();
        clearWatchdog();
        if (retriesRef.current < MAX_RETRIES && lastPromptRef.current) {
          retriesRef.current += 1;
          const attempt = retriesRef.current + 1;
          const total = MAX_RETRIES + 1;
          setSite((s) => ({
            ...s,
            chatHistory: [
              ...s.chatHistory,
              {
                role: 'assistant',
                content: `⟳ Generation stalled — retrying (attempt ${attempt} of ${total})…`,
              },
            ],
          }));
          // Hand off to the "auto-run queued prompt when ready" effect.
          setQueuedPrompt(lastPromptRef.current);
        } else {
          setSite((s) => ({
            ...s,
            chatHistory: [
              ...s.chatHistory,
              {
                role: 'assistant',
                content:
                  '⚠️ Generation stalled. Try Stop and re-send, switch to a smaller model, or refresh the page.',
              },
            ],
          }));
        }
      }, 5000);
      const bumpLastToken = () => {
        lastTokenAtRef.current = Date.now();
      };

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

      await runGeneration(
        generator,
        entry,
        snapshot,
        text,
        {
        onProse: (chunk) => {
          bumpLastToken();
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
          bumpLastToken();
          fileBuffers.current[path] = '';
        },
        onFileChunk: (path, chunk) => {
          bumpLastToken();
          tokens += chunk.length / 4;
          fileBuffers.current[path] = (fileBuffers.current[path] ?? '') + chunk;
        },
        onFileEnd: (path) => {
          bumpLastToken();
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
          clearWatchdog();
          retriesRef.current = 0;
          if (abortRef.current === controller) abortRef.current = null;
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
          clearWatchdog();
          if (abortRef.current === controller) abortRef.current = null;
          setTps(0);
          // AbortError fires when the user clicks Stop or the watchdog
          // pulls the plug; in both cases the chat already has a more
          // specific note so suppress the generic "Error: …" line.
          const isAbort =
            err?.name === 'AbortError' ||
            /abort|aborted/i.test(err?.message ?? '');
          if (isAbort) return;
          setSite((s) => ({
            ...s,
            chatHistory: [
              ...s.chatHistory,
              { role: 'assistant', content: `Error: ${err.message}` },
            ],
          }));
        },
        },
        controller.signal,
      );
    },
    [generator, modelId, site],
  );

  // Public stop handler: abort any in-flight generation, reset counters,
  // and mark the chat so the user knows what happened.
  const onStopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearWatchdog();
    retriesRef.current = 0;
    setQueuedPrompt(null);
    setBusy(false);
    setTps(0);
    setSite((s) => {
      const h = [...s.chatHistory];
      const last = h[h.length - 1];
      if (last && last.role === 'assistant' && last.content.trim() === '') {
        h[h.length - 1] = { ...last, content: 'Generation stopped.' };
      } else {
        h.push({ role: 'assistant', content: 'Generation stopped.' });
      }
      return { ...s, chatHistory: h };
    });
  }, [setSite]);

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
          user={chrome?.user}
          isDevAuth={chrome?.isDevAuth}
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
                <Preview files={previewFiles} busy={busy} onStop={onStopGeneration} />
              </Tabs.Panel>
              <Tabs.Panel value="edit" style={{ flex: 1, minHeight: 0 }}>
                <EditorView
                  files={site.files}
                  templateId={site.templateId}
                  onFileChange={onFileChange}
                  onFileCreate={onFileCreate}
                  onFileDelete={onFileDelete}
                  onDownloadZip={onDownloadZip}
                  onUploadAssets={onUploadAssets}
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
