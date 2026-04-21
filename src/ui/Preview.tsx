import { useEffect, useRef, useState, useCallback } from 'react';
import { renderPage } from '../runtime/iframeRuntime';

export type PreviewProps = {
  files: Record<string, string>;
};

export function Preview({ files }: PreviewProps) {
  const [history, setHistory] = useState<string[]>(['index.html']);
  const [cursor, setCursor] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentPath = history[cursor];
  const hasIndex = 'index.html' in files;

  const navigate = useCallback(
    (path: string) => {
      setHistory((h) => [...h.slice(0, cursor + 1), path]);
      setCursor((c) => c + 1);
    },
    [cursor],
  );

  useEffect(() => {
    if (currentPath && !(currentPath in files) && hasIndex) {
      setHistory(['index.html']);
      setCursor(0);
    }
  }, [files, currentPath, hasIndex]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const html = files[currentPath];
    if (html === undefined) return;
    iframeRef.current.srcdoc = renderPage(html, files);
  }, [currentPath, files]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'spaceforge:nav') return;
      const href = String(e.data.href).replace(/^\.?\/?/, '').split('#')[0];
      if (!href || !(href in files)) return;
      navigate(href);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [files, navigate]);

  const back = () => setCursor((c) => Math.max(0, c - 1));
  const forward = () => setCursor((c) => Math.min(history.length - 1, c + 1));
  const reload = () => {
    if (iframeRef.current && files[currentPath] !== undefined) {
      iframeRef.current.srcdoc = renderPage(files[currentPath], files);
    }
  };

  const [addressInput, setAddressInput] = useState(currentPath);
  useEffect(() => setAddressInput(currentPath), [currentPath]);

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    const path = addressInput.trim().replace(/^spaceforge:\/\/site\//, '');
    if (path in files) navigate(path);
  }

  if (!hasIndex) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7d8590',
          padding: 24,
          textAlign: 'center',
          background: '#0d1117',
        }}
      >
        Ask the assistant to build a site. The preview will appear here once there's an{' '}
        <code>&nbsp;index.html</code>.
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 8,
          borderBottom: '1px solid #30363d',
          alignItems: 'center',
        }}
      >
        <button onClick={back} disabled={cursor === 0} style={navBtn}>
          ←
        </button>
        <button onClick={forward} disabled={cursor === history.length - 1} style={navBtn}>
          →
        </button>
        <button onClick={reload} style={navBtn}>
          ⟳
        </button>
        <form onSubmit={submitAddress} style={{ flex: 1 }}>
          <input
            value={`spaceforge://site/${addressInput}`}
            onChange={(e) =>
              setAddressInput(e.target.value.replace(/^spaceforge:\/\/site\//, ''))
            }
            style={{
              width: '100%',
              background: '#161b22',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: 'SF Mono, Cascadia Code, monospace',
              boxSizing: 'border-box',
            }}
          />
        </form>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ flex: 1, border: 'none', background: '#fff' }}
        title="Preview"
      />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: '#161b22',
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 13,
};
