import { describe, it, expect } from 'vitest';
import {
  renderPage,
  resolvePage,
  resolveRoute,
  stripPicoLayoutConstraints,
  NAV_RUNTIME_MARKER,
} from '../src/runtime/iframeRuntime';

const files: Record<string, string> = {
  'index.html':
    '<!doctype html><html><head><link rel="stylesheet" href="styles.css"><script src="script.js"></script></head><body><a href="about.html">About</a></body></html>',
  'styles.css': 'body { color: teal; }',
  'script.js': 'console.log("hi");',
  'about.html': '<!doctype html><html><body>About</body></html>',
};

describe('renderPage', () => {
  it('injects nav runtime marker in head', () => {
    const out = renderPage('<!doctype html><html><head></head><body></body></html>', files);
    expect(out).toContain(NAV_RUNTIME_MARKER);
  });

  it('inlines local stylesheet references', () => {
    const out = renderPage(files['index.html'], files);
    expect(out).toContain('body { color: teal; }');
    expect(out).not.toMatch(/<link[^>]+href=["']styles\.css["']/);
  });

  it('inlines local script references', () => {
    const out = renderPage(files['index.html'], files);
    expect(out).toContain('console.log("hi");');
    expect(out).not.toMatch(/<script[^>]+src=["']script\.js["']/);
  });

  it('leaves external http(s) references intact', () => {
    const html =
      '<html><head><link rel="stylesheet" href="https://example.com/x.css"><script src="https://example.com/x.js"></script></head><body></body></html>';
    const out = renderPage(html, files);
    expect(out).toContain('https://example.com/x.css');
    expect(out).toContain('https://example.com/x.js');
  });

  it('preserves anchor links', () => {
    const out = renderPage(files['index.html'], files);
    expect(out).toContain('href="about.html"');
  });
});

describe('resolvePage', () => {
  it('renders .md pages through their Nunjucks layout', () => {
    const files = {
      'index.md': `---\nlayout: _layout.njk\ntitle: Home\n---\n# Hello\n`,
      '_layout.njk':
        '<!doctype html><html><head><title>{{ title }}</title></head><body><main>{{ content | safe }}</main></body></html>',
    };
    const html = resolvePage('index.md', files);
    expect(html).toContain('<title>Home</title>');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('renders .njk pages as-is', () => {
    const files = {
      'page.njk': '<p>{{ "hi" }}</p>',
    };
    const html = resolvePage('page.njk', files);
    expect(html).toContain('<p>hi</p>');
  });

  it('returns .html source verbatim', () => {
    const files = { 'page.html': '<p>raw</p>' };
    expect(resolvePage('page.html', files)).toBe('<p>raw</p>');
  });
});

describe('resolveRoute', () => {
  it('maps .html hrefs to .md sources when only .md exists', () => {
    const files = { 'about.md': '# about' };
    expect(resolveRoute('about.html', files)).toBe('about.md');
  });

  it('prefers direct matches over extension rewrites', () => {
    const files = { 'about.html': '<p/>', 'about.md': '# about' };
    expect(resolveRoute('about.html', files)).toBe('about.html');
  });

  it('falls back to .njk when neither .html nor .md is present', () => {
    const files = { 'about.njk': '<p/>' };
    expect(resolveRoute('about.html', files)).toBe('about.njk');
  });

  it('returns null for unknown routes', () => {
    expect(resolveRoute('missing.html', {})).toBe(null);
  });

  it('strips query strings and hashes before matching', () => {
    const files = { 'about.md': '# about' };
    expect(resolveRoute('about.html?v=1#top', files)).toBe('about.md');
  });

  it('resolves extensionless refs to .md', () => {
    const files = { 'about.md': '# about' };
    expect(resolveRoute('about', files)).toBe('about.md');
  });

  it('resolves trailing-slash refs to .md', () => {
    const files = { 'about.md': '# about' };
    expect(resolveRoute('about/', files)).toBe('about.md');
  });

  it('resolves folder-style refs to their index file', () => {
    const files = { 'about/index.md': '# about' };
    expect(resolveRoute('about/', files)).toBe('about/index.md');
  });

  it('resolves leading-slash refs by stripping the slash', () => {
    const files = { 'about.md': '# about' };
    expect(resolveRoute('/about.html', files)).toBe('about.md');
  });
});

describe('stripPicoLayoutConstraints', () => {
  it('removes the base body>header/main/footer rule', () => {
    const css =
      'a{color:red}body>footer,body>header,body>main{width:100%;margin-right:auto;margin-left:auto;padding:1rem 2rem}p{margin:0}';
    const out = stripPicoLayoutConstraints(css);
    expect(out).not.toMatch(/body>header/);
    expect(out).toContain('a{color:red}');
    expect(out).toContain('p{margin:0}');
  });

  it('removes the @media-wrapped max-width constraints', () => {
    const css =
      '@media (min-width:1280px){body>footer,body>header,body>main{max-width:1200px}}';
    expect(stripPicoLayoutConstraints(css)).toBe('');
  });

  it('leaves unrelated @media rules intact', () => {
    const css =
      '@media (min-width:768px){main{padding:2rem}}@media (min-width:576px){body>footer,body>header,body>main{max-width:510px;padding-right:0;padding-left:0}}';
    const out = stripPicoLayoutConstraints(css);
    expect(out).toContain('@media (min-width:768px){main{padding:2rem}}');
    expect(out).not.toMatch(/body>header/);
  });
});
