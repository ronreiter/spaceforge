import { describe, it, expect } from 'vitest';
import { renderPage, NAV_RUNTIME_MARKER } from '../src/runtime/iframeRuntime';

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
