import { ModelSelector } from './ModelSelector';

export type TopBarProps = {
  modelId: string;
  downloaded: Set<string>;
  onModelChange: (id: string) => void;
  status: string;
  statusKind: 'loading' | 'ready' | 'error';
  progressPct?: number;
  onStartFresh: () => void;
  onDownloadZip: () => void;
};

export function TopBar(p: TopBarProps) {
  const color =
    p.statusKind === 'ready' ? '#3fb950' : p.statusKind === 'error' ? '#f85149' : '#58a6ff';

  return (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: '#0d1117',
        color: '#e6edf3',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span>Spaceforge</span>
        <span style={{ color: '#7d8590', fontWeight: 400, fontSize: 12 }}>
          browser-local website builder
        </span>
      </div>
      <ModelSelector value={p.modelId} downloaded={p.downloaded} onChange={p.onModelChange} />
      <div
        style={{
          flex: 1,
          minWidth: 200,
          color,
          fontSize: 12,
          fontFamily: 'SF Mono, Cascadia Code, monospace',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div>{p.status}</div>
        {p.progressPct !== undefined && p.progressPct >= 0 && p.progressPct < 100 && (
          <div
            style={{
              height: 4,
              background: '#30363d',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${p.progressPct}%`,
                background: '#58a6ff',
                transition: 'width 150ms linear',
              }}
            />
          </div>
        )}
      </div>
      <button onClick={p.onDownloadZip} style={btn('#1f6feb')}>
        Download .zip
      </button>
      <button onClick={p.onStartFresh} style={btn('#da3633')}>
        Start fresh
      </button>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 12,
});
