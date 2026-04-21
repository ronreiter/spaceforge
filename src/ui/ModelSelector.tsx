import { useState } from 'react';
import { MODELS } from '../model/registry';

export type ModelSelectorProps = {
  value: string;
  downloaded: Set<string>;
  onChange: (id: string) => void;
};

export function ModelSelector({ value, downloaded, onChange }: ModelSelectorProps) {
  const [custom, setCustom] = useState('');
  const selected = MODELS.some((m) => m.id === value) ? value : '__custom__';

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={selected}
        onChange={(e) => {
          if (e.target.value !== '__custom__') onChange(e.target.value);
        }}
        style={selectStyle}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {m.sizeGB} GB{downloaded.has(m.id) ? ' · cached' : ''}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="onnx-community/… (Enter)"
        style={{
          background: '#161b22',
          color: '#e6edf3',
          border: '1px solid #30363d',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 12,
          width: 220,
          fontFamily: 'SF Mono, Cascadia Code, monospace',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && custom.trim()) onChange(custom.trim());
        }}
        title="Paste any ONNX model repo id and press Enter"
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#161b22',
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12,
};
