import { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Stack,
  Group,
  Button,
  ActionIcon,
  Text,
  ScrollArea,
  UnstyledButton,
  Box,
  Center,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconFilePlus,
  IconDownload,
  IconTrash,
  IconFileCode,
} from '@tabler/icons-react';
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
  const computed = useComputedColorScheme('dark');
  const monacoTheme = computed === 'dark' ? 'vs-dark' : 'vs-light';

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
    <Group h="100%" gap={0} align="stretch" wrap="nowrap">
      <Stack
        w={240}
        gap={0}
        style={{
          borderRight: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Box
          p="xs"
          style={{
            borderBottom: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Button
            size="xs"
            variant="light"
            leftSection={<IconFilePlus size={14} />}
            onClick={onNewFile}
            fullWidth
          >
            New file
          </Button>
        </Box>
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap={2} p={4}>
            {paths.length === 0 && (
              <Text c="dimmed" size="xs" p="sm">
                No files yet.
              </Text>
            )}
            {paths.map((p) => {
              const isActive = p === active;
              return (
                <Group
                  key={p}
                  gap={4}
                  wrap="nowrap"
                  p={4}
                  align="center"
                  style={{
                    borderRadius: 4,
                    background: isActive ? 'var(--mantine-color-indigo-filled)' : undefined,
                    color: isActive ? 'white' : undefined,
                  }}
                >
                  <UnstyledButton
                    onClick={() => setSelected(p)}
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      minWidth: 0,
                    }}
                  >
                    <Group gap={4} wrap="nowrap">
                      <IconFileCode size={12} style={{ flexShrink: 0 }} />
                      <Text
                        size="xs"
                        ff="monospace"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'inherit',
                        }}
                      >
                        {p}
                      </Text>
                    </Group>
                  </UnstyledButton>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    c={isActive ? 'white' : 'dimmed'}
                    onClick={() => onDownload(p)}
                    aria-label="Download"
                  >
                    <IconDownload size={12} />
                  </ActionIcon>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => onDelete(p)}
                    aria-label="Delete"
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {active ? (
          <Editor
            path={active}
            defaultLanguage={languageFor(active)}
            language={languageFor(active)}
            value={files[active]}
            theme={monacoTheme}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
            onChange={(v) => onFileChange(active, v ?? '')}
          />
        ) : (
          <Center h="100%">
            <Text c="dimmed" size="sm">
              No file selected.
            </Text>
          </Center>
        )}
      </Box>
    </Group>
  );
}

