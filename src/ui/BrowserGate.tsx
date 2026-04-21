import { useEffect, useState } from 'react';
import { Center, Stack, Title, Text, Code, Loader } from '@mantine/core';
import { IconAlertHexagon } from '@tabler/icons-react';

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
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader />
          <Text c="dimmed" size="sm">
            Checking browser support…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (state !== 'ok') {
    return (
      <Center h="100vh" p="xl">
        <Stack align="center" gap="md" maw={560} ta="center">
          <IconAlertHexagon size={48} color="var(--mantine-color-orange-6)" stroke={1.5} />
          <Title order={2}>Desktop Chrome 134+ required</Title>
          <Text c="dimmed">
            Spaceforge runs a multi-gigabyte language model locally via WebGPU with the{' '}
            <Code>shader-f16</Code> feature. Safari, mobile browsers, and older Chromes don't
            expose this yet.
          </Text>
          <Text c="dimmed">Please re-open this page in desktop Chrome 134 or newer.</Text>
          {detail && <Code c="dimmed">{detail}</Code>}
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
