// Bridge between the WYSIWYG editor (HTML) and on-disk Markdown. MD → HTML
// uses the same markdown-it instance configured as the preview pipeline so
// the rendered look matches; HTML → MD uses turndown with a small set of
// rules tuned to keep round-trips stable (GitHub-style dashes for bullets,
// ATX headings, fenced code blocks).

import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
});

export function markdownToHtml(src: string): string {
  return md.render(src);
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
});

// Preserve <figure>/<figcaption>/<img> as raw HTML since the model often
// emits them and markdown has no native equivalent. Same for <iframe> and
// other block embeds the editor might not understand.
turndown.keep(['figure', 'figcaption', 'iframe', 'video', 'audio']);

// Turndown's default for images drops width/height attributes. We want
// those preserved when present — the template's CSS sometimes relies on
// them for aspect ratio.
turndown.addRule('imageWithDims', {
  filter: (node) =>
    node.nodeName === 'IMG' && (node.getAttribute('width') !== null || node.getAttribute('height') !== null),
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const attrs = ['src', 'alt', 'title', 'width', 'height']
      .map((k) => {
        const v = el.getAttribute(k);
        return v !== null ? `${k}="${escapeAttr(v)}"` : '';
      })
      .filter(Boolean)
      .join(' ');
    return `<img ${attrs}>`;
  },
});

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}
