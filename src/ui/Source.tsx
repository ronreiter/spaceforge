import { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { triggerDownload } from '../storage/zip';

export type SourceProps = {
  files: Record<string, string>;
  onFileChange: (path: string, contents: string) => void;
  onFileDelete: (path: string) => void;
  onFileCreate: (path: string, contents: string) => void;
};

function languageFor(path: string): string {
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.svg')) return 'xml';
  return 'plaintext';
}

export function Source({ files, onFileChange, onFileDelete, onFileCreate }: SourceProps) {
  const paths = useMemo(() => Object.keys(files).sort(), [files]);
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);

  useEffect(() => {
    if (!paths.length) {
      setSelected(null);
      return;
    }
    if (!selected || !(selected in files)) setSelected(paths[0]);
  }, [paths, selected, files]);

  const active = selected && files[selected] !== undefined ? selected : null;

  function onNewFile() {
    const name = prompt('New file name (e.g. about.html):')?.trim();
    if (!name) return;
    if (name in files) {
      alert('file already exists');
      return;
    }
    try {
      onFileCreate(name, '');
      setSelected(name);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function onDownload(path: string) {
    const blob = new Blob([files[path] ?? ''], { type: 'text/plain' });
    triggerDownload(blob, path);
  }

  function onDelete(path: string) {
    if (!confirm(`Delete ${path}?`)) return;
    onFileDelete(path);
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        background: '#0d1117',
        color: '#e6edf3',
      }}
    >
      <div
        style={{
          width: 220,
          borderRight: '1px solid #30363d',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: 8,
            borderBottom: '1px solid #30363d',
            display: 'flex',
            gap: 6,
          }}
        >
          <button onClick={onNewFile} style={treeBtn}>
            + new
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 4, minHeight: 0 }}>
          {paths.length === 0 && (
            <div style={{ color: '#7d8590', padding: 12, fontSize: 12 }}>No files yet.</div>
          )}
          {paths.map((p) => (
            <div
              key={p}
              onClick={() => setSelected(p)}
              style={{
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                background: p === active ? '#1f6feb' : 'transparent',
                fontSize: 12,
                fontFamily: 'SF Mono, Cascadia Code, monospace',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p}</span>
              <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(p);
                  }}
                  style={miniBtn}
                  title="Download"
                >
                  ↓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p);
                  }}
                  style={{ ...miniBtn, color: '#f85149' }}
                  title="Delete"
                >
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {active ? (
          <Editor
            path={active}
            defaultLanguage={languageFor(active)}
            language={languageFor(active)}
            value={files[active]}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
            onChange={(v) => onFileChange(active, v ?? '')}
          />
        ) : (
          <div style={{ padding: 24, color: '#7d8590' }}>No file selected.</div>
        )}
      </div>
    </div>
  );
}

const treeBtn: React.CSSProperties = {
  background: '#238636',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 12,
};
const miniBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#e6edf3',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  padding: '0 4px',
};
