import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Group,
  ActionIcon,
  TextInput,
  Center,
  Text,
  Code,
  Stack,
  Box,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
  IconWorld,
} from '@tabler/icons-react';
import { renderPage, resolvePage, resolveRoute, outputPath } from '../runtime/iframeRuntime';

export type PreviewProps = {
  files: Record<string, string>;
};

function entryPath(files: Record<string, string>): string | null {
  // After the 11ty pivot, content is Markdown. We keep .njk/.html as
  // legacy fallbacks so sites generated before the pivot still preview.
  if ('index.md' in files) return 'index.md';
  if ('index.njk' in files) return 'index.njk';
  if ('index.html' in files) return 'index.html';
  return null;
}

export function Preview({ files }: PreviewProps) {
  const initial = entryPath(files) ?? 'index.html';
  const [history, setHistory] = useState<string[]>([initial]);
  const [cursor, setCursor] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentPath = history[cursor];
  const hasIndex = entryPath(files) !== null;

  const navigate = useCallback(
    (path: string) => {
      setHistory((h) => [...h.slice(0, cursor + 1), path]);
      setCursor((c) => c + 1);
    },
    [cursor],
  );

  useEffect(() => {
    if (currentPath && !(currentPath in files) && hasIndex) {
      const entry = entryPath(files);
      if (entry) {
        setHistory([entry]);
        setCursor(0);
      }
    }
  }, [files, currentPath, hasIndex]);

  useEffect(() => {
    if (!iframeRef.current) return;
    if (!(currentPath in files)) return;
    let html: string;
    try {
      html = resolvePage(currentPath, files);
    } catch (err) {
      html = `<pre style="padding:1rem;color:#b00;font-family:monospace;white-space:pre-wrap">Template error in ${currentPath}:\n\n${
        err instanceof Error ? err.message : String(err)
      }</pre>`;
    }
    iframeRef.current.srcdoc = renderPage(html, files);
  }, [currentPath, files]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'spaceforge:nav') return;
      const resolved = resolveRoute(String(e.data.href), files);
      if (resolved) navigate(resolved);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [files, navigate]);

  const back = () => setCursor((c) => Math.max(0, c - 1));
  const forward = () => setCursor((c) => Math.min(history.length - 1, c + 1));
  const reload = () => {
    if (!iframeRef.current) return;
    if (!(currentPath in files)) return;
    try {
      iframeRef.current.srcdoc = renderPage(resolvePage(currentPath, files), files);
    } catch {
      /* ignore reload-time template errors; the effect will re-run on edit */
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
      <Center h="100%" p="xl">
        <Stack gap="xs" align="center" maw={420} ta="center">
          <IconWorld size={32} stroke={1.5} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" size="sm">
            Ask the assistant to build a site. The preview will appear here once there's an{' '}
            <Code>index.md</Code>.
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack h="100%" gap={0}>
      <Group
        p="xs"
        gap={6}
        wrap="nowrap"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <ActionIcon variant="default" size="md" onClick={back} disabled={cursor === 0} aria-label="Back">
          <IconArrowLeft size={14} />
        </ActionIcon>
        <ActionIcon
          variant="default"
          size="md"
          onClick={forward}
          disabled={cursor === history.length - 1}
          aria-label="Forward"
        >
          <IconArrowRight size={14} />
        </ActionIcon>
        <ActionIcon variant="default" size="md" onClick={reload} aria-label="Reload">
          <IconRefresh size={14} />
        </ActionIcon>
        <form onSubmit={submitAddress} style={{ flex: 1 }}>
          <TextInput
            size="xs"
            value={`spaceforge://site/${outputPath(addressInput)}`}
            onChange={(e) =>
              setAddressInput(
                e.currentTarget.value.replace(/^spaceforge:\/\/site\//, ''),
              )
            }
            styles={{
              input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 11 },
            }}
          />
        </form>
      </Group>
      <Box style={{ flex: 1, background: '#fff' }}>
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Preview"
        />
      </Box>
    </Stack>
  );
}
