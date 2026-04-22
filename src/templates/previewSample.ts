import { renderMarkdownPage } from '../runtime/markdownRender';
import { injectFrameworkForExport } from '../runtime/iframeRuntime';
import { overlayFiles, type TemplateBundle } from './registry';

// Stock content used to render the template-gallery thumbnails. Kept short
// but exercises the elements each template actually styles: header, nav,
// h1/h2, paragraph, list, blockquote, footer.
const SAMPLE_INDEX_MD = `---
layout: _layout.njk
title: Sample Post
description: A preview of this template's typography and layout.
---
# Sample Heading

This is how body text looks in this template. *Italic* and **bold**
emphasis render as you would expect.

## A Subheading

- First list item
- Second list item
- Third list item

> A blockquote for quiet emphasis.
`;

const SAMPLE_LAYOUT_NJK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ title or "Preview" }}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
{% include "_header.njk" %}
<main>
{% if title %}<h1>{{ title }}</h1>{% endif %}
{% if description %}<p><em>{{ description }}</em></p>{% endif %}
{{ content | safe }}
</main>
{% include "_footer.njk" %}
</body>
</html>
`;

const SAMPLE_HEADER_NJK = `<header>
<h1 class="brand">Studio</h1>
<nav><a href="index.html">Home</a> <a href="about.html">About</a></nav>
</header>
`;

const SAMPLE_FOOTER_NJK = `<footer>
<p>&copy; {{ "now" | date("%Y") }} Studio. All rights reserved.</p>
</footer>
`;

const SAMPLE_STYLES_CSS = `/* base */
body { font-family: system-ui, sans-serif; max-width: 680px; margin: 0 auto; padding: 2rem 1.25rem; }
`;

const SAMPLE_FILES: Record<string, string> = {
  'index.md': SAMPLE_INDEX_MD,
  '_layout.njk': SAMPLE_LAYOUT_NJK,
  '_header.njk': SAMPLE_HEADER_NJK,
  '_footer.njk': SAMPLE_FOOTER_NJK,
  'styles.css': SAMPLE_STYLES_CSS,
};

// Render the template gallery thumbnail HTML for a given bundle. Returns a
// full self-contained HTML document with Pico + Google Fonts + Tabler icons
// injected (same as zip export), so the iframe looks exactly like a real
// exported page.
export function renderTemplatePreviewHtml(template: TemplateBundle): string {
  const overlay = overlayFiles(SAMPLE_FILES, template.id);
  try {
    const html = renderMarkdownPage('index.md', overlay);
    return injectFrameworkForExport(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `<!doctype html><html><body style="padding:1rem;font-family:sans-serif;color:#b00"><pre>preview error: ${message}</pre></body></html>`;
  }
}
