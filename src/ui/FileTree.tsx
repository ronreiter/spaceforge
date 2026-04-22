import { useState } from 'react';
import {
  Stack,
  Group,
  Box,
  Text,
  Button,
  ActionIcon,
  ScrollArea,
  UnstyledButton,
} from '@mantine/core';
import {
  IconFolder,
  IconFolderOpen,
  IconFileText,
  IconFileCode,
  IconFileTypeHtml,
  IconFileTypeCss,
  IconFileTypeJs,
  IconPhoto,
  IconFile,
  IconChevronRight,
  IconFilePlus,
  IconDownload,
  IconTrash,
} from '@tabler/icons-react';
import { triggerDownload } from '../storage/zip';

export type FileTreeProps = {
  files: Record<string, string>;
  activePath: string | null;
  onSelect: (path: string) => void;
  onFileCreate: (path: string, contents: string) => void;
  onFileDelete: (path: string) => void;
};

// Pick an icon for a given filename. Paths in Spaceforge are flat so we only
// need to key off the extension.
function iconFor(path: string) {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  if (ext === 'md') return IconFileText;
  if (ext === 'html' || ext === 'htm') return IconFileTypeHtml;
  if (ext === 'css') return IconFileTypeCss;
  if (ext === 'js' || ext === 'mjs') return IconFileTypeJs;
  if (ext === 'njk' || ext === 'json' || ext === 'xml' || ext === 'svg') return IconFileCode;
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp')
    return IconPhoto;
  return IconFile;
}

// Sort order: markdown content pages first, then layouts/partials, then styles,
// then everything else. Within each group, alphabetical. Produces a stable,
// intuitive ordering for the tree.
function sortPaths(paths: string[]): string[] {
  const rank = (p: string): number => {
    const lower = p.toLowerCase();
    if (lower.endsWith('.md') && !p.startsWith('_')) return 0;
    if (p.startsWith('_') && lower.endsWith('.njk')) return 1;
    if (lower.endsWith('.njk')) return 2;
    if (lower === 'styles.css') return 3;
    if (lower.endsWith('.css')) return 4;
    if (lower.endsWith('.js')) return 5;
    return 6;
  };
  return [...paths].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

const ROOT_LABEL = 'site';

export function FileTree({
  files,
  activePath,
  onSelect,
  onFileCreate,
  onFileDelete,
}: FileTreeProps) {
  const [rootOpen, setRootOpen] = useState(true);
  const paths = sortPaths(Object.keys(files));

  function onNewFile() {
    const name = prompt('New file name (e.g. about.md):')?.trim();
    if (!name) return;
    if (name in files) {
      alert('file already exists');
      return;
    }
    try {
      onFileCreate(name, '');
      onSelect(name);
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
    <Stack
      w={260}
      gap={0}
      style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}
    >
      <Box
        p="xs"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
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
          <UnstyledButton
            onClick={() => setRootOpen((v) => !v)}
            style={{ padding: '4px 6px', borderRadius: 4 }}
          >
            <Group gap={4} wrap="nowrap">
              <IconChevronRight
                size={12}
                style={{
                  transform: rootOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 120ms ease',
                  flexShrink: 0,
                }}
              />
              {rootOpen ? <IconFolderOpen size={14} /> : <IconFolder size={14} />}
              <Text size="xs" fw={600}>
                {ROOT_LABEL}
              </Text>
              <Text size="xs" c="dimmed">
                ({paths.length})
              </Text>
            </Group>
          </UnstyledButton>

          {rootOpen && paths.length === 0 && (
            <Text c="dimmed" size="xs" p="sm" pl={28}>
              No files yet.
            </Text>
          )}

          {rootOpen &&
            paths.map((p) => {
              const isActive = p === activePath;
              const Icon = iconFor(p);
              return (
                <Group
                  key={p}
                  gap={4}
                  wrap="nowrap"
                  align="center"
                  pl={20}
                  pr={4}
                  py={2}
                  style={{
                    borderRadius: 4,
                    background: isActive ? 'var(--mantine-color-neon-filled)' : undefined,
                    // Neon lime is bright — always use near-black text on it. The
                    // CSS `--mantine-color-neon-filled-contrast` variable isn't
                    // reliably computed for raw inline styles, so pin the value.
                    color: isActive ? '#0a0a0a' : undefined,
                  }}
                >
                  <UnstyledButton
                    onClick={() => onSelect(p)}
                    style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}
                  >
                    <Group gap={4} wrap="nowrap">
                      <Icon size={12} style={{ flexShrink: 0 }} />
                      <Text
                        size="xs"
                        ff="monospace"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
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
                    c={isActive ? '#0a0a0a' : 'dimmed'}
                    onClick={() => onDownload(p)}
                    aria-label="Download"
                  >
                    <IconDownload size={12} />
                  </ActionIcon>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    c={isActive ? '#0a0a0a' : 'red.6'}
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
  );
}
