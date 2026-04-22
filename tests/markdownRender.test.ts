import { describe, it, expect } from 'vitest';
import {
  parseFrontMatter,
  renderMarkdown,
  renderMarkdownPage,
  isMarkdown,
} from '../src/runtime/markdownRender';

describe('parseFrontMatter', () => {
  it('splits front matter from body', () => {
    const src = `---\nlayout: _layout.njk\ntitle: About\n---\n# Hello\n\nBody text.\n`;
    const { data, body } = parseFrontMatter(src);
    expect(data.layout).toBe('_layout.njk');
    expect(data.title).toBe('About');
    expect(body).toContain('# Hello');
  });

  it('returns empty data when there is no front matter', () => {
    const { data, body } = parseFrontMatter('# Just markdown');
    expect(data).toEqual({});
    expect(body).toBe('# Just markdown');
  });
});

describe('renderMarkdown', () => {
  it('renders headings and paragraphs to HTML', () => {
    const html = renderMarkdown('# Title\n\nHello **world**.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>world</strong>');
  });
});

describe('renderMarkdownPage', () => {
  const layout = `<!doctype html>
<html><head><title>{{ title or "Site" }}</title></head>
<body><main>{{ content | safe }}</main></body></html>`;

  it('applies the named layout from front matter', () => {
    const files = {
      'index.md': `---\nlayout: _layout.njk\ntitle: Hi\n---\n# Hello\n`,
      '_layout.njk': layout,
    };
    const html = renderMarkdownPage('index.md', files);
    expect(html).toContain('<title>Hi</title>');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<main>');
  });

  it('defaults to _layout.njk when front matter has no layout key', () => {
    const files = {
      'index.md': `# Default layout`,
      '_layout.njk': layout,
    };
    const html = renderMarkdownPage('index.md', files);
    expect(html).toContain('<h1>Default layout</h1>');
    expect(html).toContain('<main>');
  });

  it('falls back to a minimal doc when the layout is missing', () => {
    const files = { 'index.md': `---\nlayout: _missing.njk\n---\n# Orphan\n` };
    const html = renderMarkdownPage('index.md', files);
    expect(html).toContain('<h1>Orphan</h1>');
    expect(html).toContain('<!-- spaceforge: layout');
    expect(html).toContain('"_missing.njk"');
  });

  it('includes partials referenced by the layout', () => {
    const files = {
      'index.md': `# Hello`,
      '_layout.njk': `<html><body>{% include "_header.njk" %}<main>{{ content | safe }}</main></body></html>`,
      '_header.njk': `<header>Bakery</header>`,
    };
    const html = renderMarkdownPage('index.md', files);
    expect(html).toContain('<header>Bakery</header>');
    expect(html).toContain('<h1>Hello</h1>');
  });
});

describe('isMarkdown', () => {
  it('matches .md files', () => {
    expect(isMarkdown('index.md')).toBe(true);
    expect(isMarkdown('About.MD')).toBe(true);
    expect(isMarkdown('index.html')).toBe(false);
    expect(isMarkdown('index.njk')).toBe(false);
  });
});

describe('parseFrontMatter lenient mode', () => {
  it('accepts front matter with no opening fence if it ends in a --- line', () => {
    const src = `title: About\nlayout: _layout.njk\n---\n# Body\n`;
    const { data, body } = parseFrontMatter(src);
    expect(data.title).toBe('About');
    expect(data.layout).toBe('_layout.njk');
    expect(body).toContain('# Body');
    expect(body).not.toContain('title: About');
  });

  it('accepts a bare key:value block followed by a blank line (no fences at all)', () => {
    const src = `layout: _layout.njk\ntitle: About\ndescription: about me\n\n# Body\n\nParagraph.\n`;
    const { data, body } = parseFrontMatter(src);
    expect(data.layout).toBe('_layout.njk');
    expect(data.title).toBe('About');
    expect(data.description).toBe('about me');
    expect(body).toContain('# Body');
    expect(body).not.toContain('title: About');
  });

  it('does not treat plain markdown with a trailing --- as front matter', () => {
    const src = `# Heading\n\nSome text\n---\nmore\n`;
    const { data, body } = parseFrontMatter(src);
    expect(data).toEqual({});
    expect(body).toBe(src);
  });

  it('does not treat prose starting with "x: y" as front matter when it has no recognizable closing', () => {
    const src = `author: Ana wrote this\nthen a bunch of text\nand more text\nstill going.\n`;
    const { data, body } = parseFrontMatter(src);
    expect(data).toEqual({});
    expect(body).toBe(src);
  });
});
