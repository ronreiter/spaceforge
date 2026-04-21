import { useEffect, useRef, useState } from 'react';
import { BrowserGate } from './ui/BrowserGate';
import { TopBar } from './ui/TopBar';
import { Chat } from './ui/Chat';
import { Preview } from './ui/Preview';
import { Source } from './ui/Source';
import {
  loadSite,
  saveSite,
  writeFile,
  deleteFile,
  clearSite,
  emptySite,
  type SiteState,
  type ChatMessage,
} from './storage/files';
import { buildZip, triggerDownload } from './storage/zip';
import { loadModel, type Generator, type ProgressInfo } from './model/loader';
import { runGeneration } from './model/generate';
import {
  DEFAULT_MODEL_ID,
  MODEL_STORAGE_KEY,
  getModel,
  fallbackEntry,
} from './model/registry';

type StatusKind = 'loading' | 'ready' | 'error';

export default function App() {
  return (
    <BrowserGate>
      <AppInner />
    </BrowserGate>
  );
}

function AppInner() {
  const [site, setSite] = useState<SiteState>(() => loadSite());
  useEffect(() => {
    saveSite(site);
  }, [site]);

  const [tab, setTab] = useState<'preview' | 'source'>('preview');

  const [modelId, setModelId] = useState<string>(
    () => localStorage.getItem(MODEL_STORAGE_KEY) ?? site.model ?? DEFAULT_MODEL_ID,
  );
  const [generator, setGenerator] = useState<Generator | null>(null);
  const [status, setStatus] = useState<string>('Checking model…');
  const [statusKind, setStatusKind] = useState<StatusKind>('loading');
  const [progressPct, setProgressPct] = useState<number | undefined>(undefined);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tokensPerSec, setTps] = useState<number>(0);

  const fileBuffers = useRef<Record<string, string>>({});

  // Load/swap model whenever modelId changes.
  useEffect(() => {
    const entry = getModel(modelId) ?? fallbackEntry(modelId);
    localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    setStatusKind('loading');
    setStatus(`Loading ${entry.label}…`);
    setProgressPct(undefined);
    setGenerator(null);

    let cancelled = false;
    loadModel(entry, (p: ProgressInfo) => {
      if (cancelled) return;
      if (p.status === 'progress' && p.loaded && p.total) {
        const pct = (p.loaded / p.total) * 100;
        setProgressPct(pct);
        setStatus(`Downloading ${entry.label}: ${pct.toFixed(0)}%`);
      } else if (p.status === 'done') {
        setStatus(`Preparing ${entry.label}…`);
      } else if (p.status === 'ready') {
        setProgressPct(undefined);
        setStatus(`${entry.label} ready`);
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

  async function onSend(text: string) {
    if (!generator || busy) return;
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
        const buf = fileBuffers.current[path] ?? '';
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
        delete fileBuffers.current[path];
        setSite((s) => {
          const h = [...s.chatHistory];
          const last = h[h.length - 1];
          if (last && last.role === 'assistant') {
            h[h.length - 1] = {
              ...last,
              content: last.content + `\n\n[file "${path}" was cut off]`,
            };
          }
          return { ...s, chatHistory: h };
        });
      },
      onComplete: () => {
        setBusy(false);
        clearInterval(tick);
        setTps(0);
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
        alert(e instanceof Error ? e.message : String(e));
        return s;
      }
    });

  async function onDownloadZip() {
    const blob = await buildZip(site.files);
    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
    triggerDownload(blob, `spaceforge-site-${ts}.zip`);
  }

  function onStartFresh() {
    if (
      !confirm(
        'This wipes the current site and chat history. Download first if you want to keep it. Continue?',
      )
    )
      return;
    clearSite();
    const fresh = emptySite();
    fresh.model = modelId;
    setSite(fresh);
    fileBuffers.current = {};
  }

  const statusLine = busy ? 'Generating…' : undefined;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
      }}
    >
      <TopBar
        modelId={modelId}
        downloaded={downloaded}
        onModelChange={setModelId}
        status={status}
        statusKind={statusKind}
        progressPct={progressPct}
        onDownloadZip={onDownloadZip}
        onStartFresh={onStartFresh}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: 380, minWidth: 300, borderRight: '1px solid #30363d' }}>
          <Chat
            messages={site.chatHistory}
            disabled={busy || statusKind !== 'ready'}
            statusLine={statusLine}
            tokensPerSecond={tokensPerSec}
            onSend={onSend}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: 8,
              borderBottom: '1px solid #30363d',
            }}
          >
            <button onClick={() => setTab('preview')} style={tabBtn(tab === 'preview')}>
              Preview
            </button>
            <button onClick={() => setTab('source')} style={tabBtn(tab === 'source')}>
              Source
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === 'preview' ? (
              <Preview files={site.files} />
            ) : (
              <Source
                files={site.files}
                onFileChange={onFileChange}
                onFileDelete={onFileDelete}
                onFileCreate={onFileCreate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  background: active ? '#1f6feb' : 'transparent',
  color: active ? '#fff' : '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: 6,
  padding: '4px 14px',
  cursor: 'pointer',
  fontSize: 12,
});
