import { useEffect, useState } from 'react';

type GateState = 'checking' | 'ok' | 'no-webgpu' | 'no-features';

export function BrowserGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('checking');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!('gpu' in navigator)) {
        setState('no-webgpu');
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
          setState('no-webgpu');
          return;
        }
        const features: Set<string> | undefined = adapter.features;
        const hasF16 = features?.has?.('shader-f16') ?? false;
        if (!hasF16) {
          setDetail('missing shader-f16');
          setState('no-features');
          return;
        }
        setState('ok');
      } catch (err) {
        setDetail(err instanceof Error ? err.message : String(err));
        setState('no-webgpu');
      }
    })();
  }, []);

  if (state === 'checking') {
    return <div style={center}>Checking browser support…</div>;
  }

  if (state !== 'ok') {
    return (
      <div
        style={{
          ...center,
          flexDirection: 'column',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ marginBottom: 16, fontSize: 28 }}>Desktop Chrome 134+ required</h1>
          <p style={{ color: '#7d8590', marginBottom: 16, lineHeight: 1.55 }}>
            Spaceforge runs a multi-gigabyte language model locally via WebGPU with the{' '}
            <code style={{ color: '#e6edf3' }}>shader-f16</code> feature. Safari, mobile browsers,
            and older Chromes don't expose these yet.
          </p>
          <p style={{ color: '#7d8590', marginBottom: 16 }}>
            Please re-open this page in desktop Chrome 134 or newer.
          </p>
          {detail && (
            <p style={{ color: '#484f58', fontSize: 12, fontFamily: 'monospace' }}>
              ({detail})
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const center: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#e6edf3',
  background: '#0d1117',
  fontFamily: 'system-ui, sans-serif',
};
