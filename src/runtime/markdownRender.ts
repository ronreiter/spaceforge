import MarkdownIt from 'markdown-it';
import { buildCollections, createEnv, outputPath } from './nunjucksRender';

export { parseFrontMatter } from './frontMatter';
export type { FrontMatter } from './frontMatter';

import { parseFrontMatter } from './frontMatter';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
});

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

  const collections = buildCollections(files);
  const preContext = {
    ...data,
    page: { path, url: outputPath(path) },
    site: siteContext,
    collections,
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
    collections,
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
