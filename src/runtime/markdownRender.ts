import MarkdownIt from 'markdown-it';
import fm from 'front-matter';
import { createEnv, outputPath } from './nunjucksRender';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
});

export type FrontMatter = { data: Record<string, unknown>; body: string };

// Small models frequently drop the opening `---` of the YAML front matter and
// emit:
//     title: About
//     layout: _layout.njk
//     ---
//     # About
// …which `front-matter` rejects because the block isn't fenced on both sides.
// Rather than lose the front matter (and leak YAML lines into the rendered
// body), we first check for a leading `---` fence, and if it's missing but a
// plausible `key: value` block terminates in a trailing `---` line, we treat
// that block as front matter.
const LEADING_FENCE = /^---\r?\n/;
const FRONT_KV_LINE = /^[A-Za-z_][A-Za-z0-9_\-]*\s*:/;

function lenientFrontMatterSplit(src: string): { raw: string; body: string } | null {
  if (LEADING_FENCE.test(src)) return null;
  const lines = src.split(/\r?\n/);
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^---\s*$/.test(line)) {
      end = i;
      break;
    }
    if (line.trim() === '') continue;
    if (!FRONT_KV_LINE.test(line)) return null;
  }
  if (end <= 0) return null;
  const raw = lines.slice(0, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { raw, body };
}

export function parseFrontMatter(src: string): FrontMatter {
  const lenient = lenientFrontMatterSplit(src);
  if (lenient) {
    const fenced = `---\n${lenient.raw}\n---\n${lenient.body}`;
    const result = fm<Record<string, unknown>>(fenced);
    return { data: result.attributes ?? {}, body: result.body };
  }
  const result = fm<Record<string, unknown>>(src);
  return { data: result.attributes ?? {}, body: result.body };
}

export function renderMarkdown(body: string): string {
  return md.render(body);
}

const DEFAULT_LAYOUT = '_layout.njk';

// Render a .md page through its layout, 11ty-style. Layouts receive
// { ...frontmatter, content, page } and inject the rendered markdown via
// `{{ content | safe }}`. If the named layout isn't in `files`, we fall
// back to a minimal wrapper document so the page still previews.
export function renderMarkdownPage(
  path: string,
  files: Record<string, string>,
): string {
  const src = files[path] ?? '';
  const { data, body } = parseFrontMatter(src);
  const content = renderMarkdown(body);
  const layoutName =
    typeof data.layout === 'string' && data.layout ? data.layout : DEFAULT_LAYOUT;

  const context = {
    ...data,
    content,
    page: { path, url: outputPath(path) },
  };

  if (!(layoutName in files)) {
    const title =
      typeof data.title === 'string' && data.title ? data.title : 'Preview';
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <main>${content}</main>
  <!-- spaceforge: layout "${escapeHtml(layoutName)}" not found; rendered markdown wrapped in a minimal document -->
</body>
</html>`;
  }

  const env = createEnv(files);
  return env.render(layoutName, context);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isMarkdown(path: string): boolean {
  return path.toLowerCase().endsWith('.md');
}
