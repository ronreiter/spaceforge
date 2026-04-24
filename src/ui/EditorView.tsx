import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Center,
  Group,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  Badge,
  useComputedColorScheme,
} from '@mantine/core';
import { IconEdit, IconCode, IconEye } from '@tabler/icons-react';
import Editor from '@monaco-editor/react';
import { WysiwygEditor } from './WysiwygEditor';
import { FileTree } from './FileTree';
import { parseFrontMatter } from '../runtime/markdownRender';
import { composeMarkdown } from '../lib/frontMatter';
import { overlayFiles } from '../templates/registry';

export type EditorViewProps = {
  files: Record<string, string>;
  templateId: string;
  onFileChange: (path: string, contents: string) => void;
  onFileCreate: (path: string, contents: string) => void;
  onFileDelete: (path: string) => void;
  onDownloadZip?: () => void;
  // When true, Monaco is read-only, TipTap is non-editable, and the
  // "New file" / "Delete file" affordances are hidden. Viewer role.
  readOnly?: boolean;
};

function defaultPath(files: Record<string, string>): string | null {
  // Prefer index.md, then any .md page, then the first file alphabetically.
  if ('index.md' in files) return 'index.md';
  const mdPages = Object.keys(files)
    .filter((p) => p.toLowerCase().endsWith('.md') && !p.startsWith('_'))
    .sort();
  if (mdPages.length > 0) return mdPages[0];
  const all = Object.keys(files).sort();
  return all[0] ?? null;
}

function isVisualEditable(path: string): boolean {
  return path.toLowerCase().endsWith('.md') && !path.startsWith('_');
}

function languageFor(path: string): string {
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.svg')) return 'xml';
  if (path.endsWith('.njk')) return 'html';
  return 'plaintext';
}

type SubTab = 'visual' | 'source';

export function EditorView({
  files,
  templateId,
  onFileChange,
  onFileCreate,
  onFileDelete,
  onDownloadZip,
  readOnly,
}: EditorViewProps) {
  const [selected, setSelected] = useState<string | null>(() => defaultPath(files));
  const [subTab, setSubTab] = useState<SubTab>('visual');

  // Keep selection valid as files change (model adds/removes, user deletes).
  useEffect(() => {
    if (selected && selected in files) return;
    setSelected(defaultPath(files));
  }, [files, selected]);

  // When the active file becomes visual-ineligible, fall back to Source so
  // the user sees something instead of the "Visual editing not supported"
  // empty state.
  useEffect(() => {
    if (selected && !isVisualEditable(selected) && subTab === 'visual') {
      setSubTab('source');
    }
  }, [selected, subTab]);

  const templateCss = useMemo(() => {
    const overlay = overlayFiles(files, templateId);
    return overlay['styles.css'] ?? '';
  }, [files, templateId]);

  const active = selected && selected in files ? selected : null;
  const visualOk = active ? isVisualEditable(active) : false;

  return (
    <Group h="100%" gap={0} align="stretch" wrap="nowrap">
      <FileTree
        files={files}
        activePath={active}
        onSelect={setSelected}
        onFileCreate={onFileCreate}
        onFileDelete={onFileDelete}
        onDownloadZip={onDownloadZip}
        readOnly={readOnly}
      />
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {!active ? (
          <Center h="100%" p="xl">
            <Stack gap="xs" align="center" maw={420} ta="center">
              <IconEdit size={32} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="sm">
                Ask the assistant to build a site — files will appear in the tree.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Tabs
            value={subTab}
            onChange={(v) => v && setSubTab(v as SubTab)}
            variant="pills"
            color="neon"
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <Group
              justify="space-between"
              gap="xs"
              p="xs"
              wrap="nowrap"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden', minWidth: 0 }}>
                <Text size="xs" c="dimmed" ff="monospace" truncate>
                  {active}
                </Text>
                {visualOk && <Badge size="xs" variant="light" color="gray">markdown</Badge>}
              </Group>
              <Tabs.List>
                <Tooltip
                  label={
                    visualOk
                      ? 'Rich editor using the active template'
                      : 'Visual editor only works on .md pages'
                  }
                  withArrow
                  openDelay={400}
                >
                  <Tabs.Tab
                    value="visual"
                    leftSection={<IconEye size={14} />}
                    disabled={!visualOk}
                  >
                    Visual
                  </Tabs.Tab>
                </Tooltip>
                <Tabs.Tab value="source" leftSection={<IconCode size={14} />}>
                  Source
                </Tabs.Tab>
              </Tabs.List>
            </Group>

            <Tabs.Panel value="visual" style={{ flex: 1, minHeight: 0 }}>
              {visualOk ? (
                <PageEditor
                  key={active}
                  path={active}
                  source={files[active] ?? ''}
                  templateCss={templateCss}
                  onFileChange={onFileChange}
                  readOnly={readOnly}
                />
              ) : (
                <Center h="100%" p="xl">
                  <Text c="dimmed" size="sm" ta="center" maw={360}>
                    Switch to <b>Source</b> to edit this file. The visual editor only applies to
                    Markdown pages.
                  </Text>
                </Center>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="source" style={{ flex: 1, minHeight: 0 }}>
              <SourceEditor
                path={active}
                value={files[active] ?? ''}
                onChange={(v) => onFileChange(active, v)}
                readOnly={readOnly}
              />
            </Tabs.Panel>
          </Tabs>
        )}
      </Box>
    </Group>
  );
}

function SourceEditor({
  path,
  value,
  onChange,
  readOnly,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const computed = useComputedColorScheme('dark');
  const monacoTheme = computed === 'dark' ? 'vs-dark' : 'vs-light';
  return (
    <Editor
      path={path}
      defaultLanguage={languageFor(path)}
      language={languageFor(path)}
      value={value}
      theme={monacoTheme}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: !!readOnly,
      }}
      onChange={(v) => onChange(v ?? '')}
    />
  );
}

type PageEditorProps = {
  path: string;
  source: string;
  templateCss: string;
  onFileChange: (path: string, contents: string) => void;
  readOnly?: boolean;
};

function PageEditor({ path, source, templateCss, onFileChange, readOnly }: PageEditorProps) {
  const initial = useMemo(() => parseFrontMatter(source), [source]);
  const [data, setData] = useState<Record<string, unknown>>(initial.data);
  const [body, setBody] = useState<string>(initial.body);

  // Re-sync when the source prop changes (model edits, undo, etc.).
  useEffect(() => {
    const parsed = parseFrontMatter(source);
    setData(parsed.data);
    setBody(parsed.body);
  }, [source]);

  const commit = (nextData: Record<string, unknown>, nextBody: string) => {
    onFileChange(path, composeMarkdown(nextData, nextBody));
  };

  const updateField = (key: string, value: string) => {
    const next = { ...data, [key]: value };
    setData(next);
    commit(next, body);
  };

  const onBodyChange = (nextMd: string) => {
    setBody(nextMd);
    commit(data, nextMd);
  };

  const title = typeof data.title === 'string' ? data.title : '';
  const description = typeof data.description === 'string' ? data.description : '';
  const layout = typeof data.layout === 'string' ? data.layout : '';

  return (
    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
      <Stack
        gap="xs"
        p="md"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Group gap="xs" wrap="wrap">
          {layout && (
            <Badge size="xs" variant="light" color="gray">
              layout: {layout}
            </Badge>
          )}
        </Group>
        <TextInput
          size="sm"
          label="Title"
          value={title}
          onChange={(e) => updateField('title', e.currentTarget.value)}
          placeholder="Page title"
          readOnly={readOnly}
          disabled={readOnly}
        />
        <TextInput
          size="sm"
          label="Description"
          value={description}
          onChange={(e) => updateField('description', e.currentTarget.value)}
          placeholder="Short description (shown in meta tags)"
          readOnly={readOnly}
          disabled={readOnly}
        />
      </Stack>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <WysiwygEditor
          value={body}
          onChange={onBodyChange}
          templateCss={templateCss}
          placeholder="Write your page content here…"
          readOnly={readOnly}
        />
      </Box>
    </Box>
  );
}
