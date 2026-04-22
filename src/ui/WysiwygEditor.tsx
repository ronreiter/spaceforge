import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useMemo, useRef } from 'react';
import { ActionIcon, Box, Group, Tooltip, Divider } from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconQuote,
  IconLink,
  IconClearFormatting,
  IconArrowBackUp,
  IconArrowForwardUp,
} from '@tabler/icons-react';
import { markdownToHtml, htmlToMarkdown } from '../lib/markdownHtml';
import { scopeCss } from '../lib/scopeCss';

export type WysiwygEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  templateCss: string;
  placeholder?: string;
  readOnly?: boolean;
};

// The wrapper class under which all template CSS is scoped. Kept stable
// because stylesheets in <style> blocks reference it literally.
const CANVAS_CLASS = 'sf-editor-canvas';

export function WysiwygEditor({
  value,
  onChange,
  templateCss,
  placeholder,
  readOnly,
}: WysiwygEditorProps) {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        // Use defaults; the heading extension supports H1..H6. Disable
        // dropcursor/gapcursor (inherited) styling — TipTap v3 includes them.
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing…',
        emptyEditorClass: 'sf-editor-empty',
      }),
    ],
    content: markdownToHtml(value || ''),
    editorProps: {
      attributes: {
        // ProseMirror renders content inside <div class="ProseMirror">. We
        // tag it with the canvas class so template CSS (scoped to
        // .sf-editor-canvas) applies directly to the editable region.
        class: `${CANVAS_CLASS} ProseMirror`,
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(htmlToMarkdown(html));
    },
  });

  // setEditable imperatively when prop changes (TipTap useEditor options
  // don't re-apply on re-render).
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Guard against infinite loops: we only swap content back in when the
  // incoming prop differs from what the editor would currently serialize.
  // This handles: (a) switching to a different file, (b) outside updates
  // (e.g. the model regenerated the file).
  const lastValueRef = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    const currentMd = htmlToMarkdown(editor.getHTML());
    if (currentMd !== value) {
      editor.commands.setContent(markdownToHtml(value || ''), { emitUpdate: false });
    }
    lastValueRef.current = value;
  }, [value, editor]);

  const scopedCss = useMemo(() => scopeCss(templateCss, `.${CANVAS_CLASS}`), [templateCss]);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Toolbar editor={editor} />
      <Box style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff' }}>
        {/* Scoped template CSS — all rules prefixed with .sf-editor-canvas */}
        <style>{scopedCss}</style>
        <style>{DEFAULT_CANVAS_CSS}</style>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

// Minimal fallback styles for the editor itself (cursor, focus, placeholder).
// These are intentionally low-specificity so template CSS wins on layout,
// color, and typography.
const DEFAULT_CANVAS_CSS = `
.${CANVAS_CLASS} {
  min-height: 100%;
  padding: 2rem 1.5rem 6rem;
  outline: none;
  box-sizing: border-box;
}
.${CANVAS_CLASS} > * + * { margin-top: 0.75rem; }
.${CANVAS_CLASS} p.sf-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #9ca3af;
  float: left;
  pointer-events: none;
  height: 0;
}
.${CANVAS_CLASS}:focus { outline: none; }
.${CANVAS_CLASS} ul, .${CANVAS_CLASS} ol { padding-left: 1.5rem; }
.${CANVAS_CLASS} code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
`;

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const b = (cmd: () => void, active: boolean, icon: React.ReactNode, label: string) => (
    <Tooltip label={label} withArrow openDelay={400}>
      <ActionIcon
        variant={active ? 'filled' : 'subtle'}
        color={active ? 'neon' : undefined}
        onClick={cmd}
        aria-label={label}
        size="sm"
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  return (
    <Group
      gap={2}
      p="xs"
      wrap="wrap"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      {b(() => editor.chain().focus().undo().run(), false, <IconArrowBackUp size={14} />, 'Undo')}
      {b(() => editor.chain().focus().redo().run(), false, <IconArrowForwardUp size={14} />, 'Redo')}
      <Divider orientation="vertical" mx={4} />
      {b(
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        editor.isActive('heading', { level: 1 }),
        <IconH1 size={14} />,
        'Heading 1',
      )}
      {b(
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        editor.isActive('heading', { level: 2 }),
        <IconH2 size={14} />,
        'Heading 2',
      )}
      {b(
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        editor.isActive('heading', { level: 3 }),
        <IconH3 size={14} />,
        'Heading 3',
      )}
      <Divider orientation="vertical" mx={4} />
      {b(
        () => editor.chain().focus().toggleBold().run(),
        editor.isActive('bold'),
        <IconBold size={14} />,
        'Bold',
      )}
      {b(
        () => editor.chain().focus().toggleItalic().run(),
        editor.isActive('italic'),
        <IconItalic size={14} />,
        'Italic',
      )}
      {b(
        () => editor.chain().focus().toggleStrike().run(),
        editor.isActive('strike'),
        <IconStrikethrough size={14} />,
        'Strikethrough',
      )}
      {b(
        () => editor.chain().focus().toggleCode().run(),
        editor.isActive('code'),
        <IconCode size={14} />,
        'Inline code',
      )}
      <Divider orientation="vertical" mx={4} />
      {b(
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive('bulletList'),
        <IconList size={14} />,
        'Bullet list',
      )}
      {b(
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive('orderedList'),
        <IconListNumbers size={14} />,
        'Numbered list',
      )}
      {b(
        () => editor.chain().focus().toggleBlockquote().run(),
        editor.isActive('blockquote'),
        <IconQuote size={14} />,
        'Blockquote',
      )}
      <Divider orientation="vertical" mx={4} />
      {b(setLink, editor.isActive('link'), <IconLink size={14} />, 'Link')}
      {b(
        () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
        false,
        <IconClearFormatting size={14} />,
        'Clear formatting',
      )}
    </Group>
  );
}
