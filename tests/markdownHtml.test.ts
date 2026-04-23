import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../src/lib/markdownHtml';
import { composeMarkdown, serializeFrontMatter } from '../src/lib/frontMatter';
import { scopeCss } from '../src/lib/scopeCss';

describe('markdownToHtml', () => {
  it('renders headings, bold, and italic', () => {
    const html = markdownToHtml('# Hi\n\nHello **bold** and *italic*.');
    expect(html).toContain('<h1>Hi</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders bullet lists', () => {
    const html = markdownToHtml('- one\n- two\n');
    expect(html).toMatch(/<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
  });
});

describe('htmlToMarkdown', () => {
  it('round-trips a basic document', () => {
    const src = '# Hi\n\nHello **world**.\n\n- one\n- two';
    const html = markdownToHtml(src);
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Hi');
    expect(md).toContain('**world**');
    expect(md).toMatch(/-\s+one/);
    expect(md).toMatch(/-\s+two/);
  });

  it('converts blockquotes', () => {
    const html = '<blockquote><p>Quoted text.</p></blockquote>';
    expect(htmlToMarkdown(html)).toContain('> Quoted text.');
  });

  it('emits ATX headings and fenced code blocks', () => {
    const html = '<h2>Title</h2><pre><code>let x = 1;\n</code></pre>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('## Title');
    expect(md).toMatch(/```[\s\S]*let x = 1;[\s\S]*```/);
  });
});

describe('serializeFrontMatter', () => {
  it('produces fenced YAML for simple fields', () => {
    const out = serializeFrontMatter({ title: 'Hi', layout: '_layout.njk' });
    expect(out).toBe('---\nlayout: _layout.njk\ntitle: Hi\n---\n');
  });

  it('quotes strings with special chars', () => {
    const out = serializeFrontMatter({ title: 'Hello: World' });
    expect(out).toContain('title: "Hello: World"');
  });

  it('returns empty string for empty data', () => {
    expect(serializeFrontMatter({})).toBe('');
  });
});

describe('composeMarkdown', () => {
  it('assembles front matter + body', () => {
    const out = composeMarkdown({ title: 'X' }, '# Body\n');
    expect(out.startsWith('---\ntitle: X\n---\n')).toBe(true);
    expect(out).toContain('# Body');
  });

  it('omits fence when no data', () => {
    const out = composeMarkdown({}, '# Body');
    expect(out).toBe('# Body\n');
  });
});

describe('scopeCss', () => {
  it('prefixes top-level selectors with the scope', () => {
    const out = scopeCss('h1 { color: red }', '.canvas');
    expect(out).toContain('.canvas h1');
  });

  it('collapses :root, html, body selectors to the scope', () => {
    const out = scopeCss(':root { --c: red } body { color: red }', '.canvas');
    expect(out).toContain('.canvas { --c: red }');
    expect(out).toContain('.canvas { color: red }');
    expect(out).not.toContain(':root {');
    expect(out).not.toContain('body {');
  });

  it('scopes rules inside @media blocks', () => {
    const out = scopeCss('@media (min-width: 600px) { h1 { font-size: 2rem } }', '.canvas');
    expect(out).toContain('@media (min-width: 600px)');
    expect(out).toContain('.canvas h1');
  });

  it('keeps @keyframes untouched', () => {
    const out = scopeCss('@keyframes foo { from { opacity: 0 } to { opacity: 1 } }', '.canvas');
    expect(out).toContain('@keyframes foo');
    expect(out).not.toContain('.canvas from');
  });

  it('handles comma-separated selector lists', () => {
    const out = scopeCss('h1, h2 { margin: 0 }', '.canvas');
    expect(out).toContain('.canvas h1');
    expect(out).toContain('.canvas h2');
  });
});
