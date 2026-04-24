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

// Small models frequently slip on the YAML front-matter fences. Two shapes
// we see in the wild, neither of which `front-matter` accepts:
//
//   (a) Missing opening fence, closing fence present:
//         title: About
//         layout: _layout.njk
//         ---
//         # About
//
//   (b) Both fences missing — a bare key:value block then a blank line then
//       the body:
//         layout: _layout.njk
//         title: About
//
//         # About
//
// We detect either by reading leading lines that look like `key: value`
// and stopping at the first `---` line or blank line. The collected lines
// are treated as front matter. The Markdown body must still start with a
// recognizable markdown token (heading, blank line already consumed, etc.)
// for us to commit — otherwise we bail and pass the original source to
// `front-matter` so arbitrary text that happens to contain `foo: bar` on
// line 1 doesn't get mis-parsed.
const LEADING_FENCE = /^---\r?\n/;
const FRONT_KV_LINE = /^[A-Za-z_][A-Za-z0-9_\-]*\s*:/;

function lenientFrontMatterSplit(src: string): { raw: string; body: string } | null {
  if (LEADING_FENCE.test(src)) return null;
  const lines = src.split(/\r?\n/);
  // Must start with a key:value line — otherwise it's just markdown.
  if (lines.length === 0 || !FRONT_KV_LINE.test(lines[0])) return null;

  let fmEnd = -1;     // index of closing `---` line, -1 if absent
  let blankEnd = -1;  // index of first blank line after a kv block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^---\s*$/.test(line)) {
      fmEnd = i;
      break;
    }
    if (line.trim() === '') {
      blankEnd = i;
      break;
    }
    if (!FRONT_KV_LINE.test(line)) return null;
  }

  if (fmEnd > 0) {
    return {
      raw: lines.slice(0, fmEnd).join('\n'),
      body: lines.slice(fmEnd + 1).join('\n'),
    };
  }
  if (blankEnd > 0) {
    return {
      raw: lines.slice(0, blankEnd).join('\n'),
      body: lines.slice(blankEnd + 1).join('\n'),
    };
  }
  return null;
}

export function parseFrontMatter(src: string): FrontMatter {
  // Malformed YAML (unquoted colons, bad indentation, etc.) must not
  // crash the caller — the editor relies on this to open any saved
  // page, even ones the model emitted with invalid front-matter. On
  // failure we fall back to treating the whole source as a bare body.
  const lenient = lenientFrontMatterSplit(src);
  if (lenient) {
    const fenced = `---\n${lenient.raw}\n---\n${lenient.body}`;
    try {
      const result = fm<Record<string, unknown>>(fenced);
      return { data: result.attributes ?? {}, body: result.body };
    } catch {
      return { data: {}, body: lenient.body };
    }
  }
  try {
    const result = fm<Record<string, unknown>>(src);
    return { data: result.attributes ?? {}, body: result.body };
  } catch {
    return { data: {}, body: src };
  }
}

export function renderMarkdown(body: string): string {
  return md.render(body);
}

// Process Nunjucks expressions inside a markdown body. Only runs if the body
// actually contains Nunjucks-looking syntax (`{% ... %}` or `{{ ... }}`) so
// plain markdown is untouched and no rendering cost is paid for simple
// documents. Failures fall back to the original body so a malformed tag
// doesn't break the preview.
function preprocessBody(
  body: string,
  files: Record<string, string>,
  context: Record<string, unknown>,
): string {
  if (!/\{[{%]/.test(body)) return body;
  try {
    const env = createEnv(files);
    return env.renderString(body, context);
  } catch {
    return body;
  }
}

const DEFAULT_LAYOUT = '_layout.njk';

// Render a .md page through its layout, 11ty-style. Layouts receive
// { ...frontmatter, content, page } and inject the rendered markdown via
// `{{ content | safe }}`. If the named layout isn't in `files`, we fall
// back to a minimal wrapper document so the page still previews.
//
// 11ty's default pipeline runs Liquid/Nunjucks on the markdown body BEFORE
// markdown-it, so `{% for %}`, `{% set %}`, and `{{ ... }}` expressions in
// the body work. We do the same here — when the pre-processing fails (e.g.
// the model produced malformed tag syntax) we fall back to the raw body so
// the page still previews instead of erroring.
export function renderMarkdownPage(
  path: string,
  files: Record<string, string>,
  siteContext: { slug?: string; name?: string } = {},
): string {
  const src = files[path] ?? '';
  const { data, body } = parseFrontMatter(src);

  const preContext = {
    ...data,
    page: { path, url: outputPath(path) },
    site: siteContext,
  };
  const processedBody = preprocessBody(body, files, preContext);
  const content = renderMarkdown(processedBody);
  const layoutName =
    typeof data.layout === 'string' && data.layout ? data.layout : DEFAULT_LAYOUT;

  const context = {
    ...data,
    content,
    page: { path, url: outputPath(path) },
    site: siteContext,
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
