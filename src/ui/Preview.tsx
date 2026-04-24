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
import {
  renderPage,
  resolvePage,
  resolveRoute,
  outputPath,
} from '../runtime/iframeRuntime';

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

  // Render the current history entry. If the entry doesn't correspond to any
  // known file (e.g. the user clicked a dangling link), show an inline 404 —
  // keep the entry in history so Back still works and the address bar shows
  // the missing path, not the previous good one.
  useEffect(() => {
    if (!iframeRef.current) return;
    // Run the same .html → .md fallback the link-click handler uses, so the
    // preview works when the current entry was computed at mount time (e.g.
    // `index.html` as the default) and the backing source file only
    // appeared later in the edit stream (e.g. `index.md`).
    const resolved =
      currentPath in files ? currentPath : resolveRoute(currentPath, files);
    if (resolved && resolved in files) {
      let html: string;
      try {
        html = resolvePage(resolved, files);
      } catch (err) {
        html = `<pre style="padding:1rem;color:#b00;font-family:monospace;white-space:pre-wrap">Template error in ${resolved}:\n\n${
          err instanceof Error ? err.message : String(err)
        }</pre>`;
      }
      iframeRef.current.srcdoc = renderPage(html, files);
      return;
    }
    const known = Object.keys(files).sort().slice(0, 20).join('\n');
    const display = outputPath(currentPath);
    iframeRef.current.srcdoc = `<pre style="padding:1.5rem;font-family:ui-monospace,monospace;color:#333;white-space:pre-wrap;line-height:1.6">404 — no file matches <b>${display}</b>\n\nAsk the assistant to create this page, or fix the link in the source.\n\nFiles currently in the site:\n${known}</pre>`;
  }, [currentPath, files]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'spaceforge:nav') return;
      const href = String(e.data.href);
      const resolved = resolveRoute(href, files);
      // Navigate either way — if the link is dangling, we push the raw href
      // into history so the URL bar reflects the click, Back works, and the
      // render effect shows the inline 404.
      navigate(resolved ?? href);
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
