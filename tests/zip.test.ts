import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildZip } from '../src/storage/zip';
import { TEMPLATES, type TemplateBundle } from '../src/templates/registry';

describe('buildZip', () => {
  it('produces a zip containing every plain file with framework injected into HTML pages', async () => {
    const blob = await buildZip({ 'index.html': '<p>a</p>', 'styles.css': 'body{}' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(['index.html', 'styles.css']);
    const indexHtml = await zip.files['index.html'].async('string');
    expect(indexHtml).toContain('<p>a</p>');
    expect(indexHtml).toContain('data-spaceforge-framework');
    expect(indexHtml).toContain('fonts.googleapis.com');
    expect(await zip.files['styles.css'].async('string')).toBe('body{}');
  });

  it('renders .md pages through their Nunjucks layout into .html', async () => {
    const files = {
      'index.md': `---\nlayout: _layout.njk\ntitle: Home\n---\n# Hello\n`,
      '_layout.njk':
        '<!doctype html><html><head><title>{{ title }}</title></head><body><main>{{ content | safe }}</main></body></html>',
      'styles.css': 'body{}',
    };
    const blob = await buildZip(files);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files).sort();

    expect(names).toContain('index.html');
    expect(names).toContain('styles.css');
    expect(names).not.toContain('index.md');
    expect(names).not.toContain('_layout.njk');

    const html = await zip.files['index.html'].async('string');
    expect(html).toContain('<title>Home</title>');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<main>');
  });

  it('skips underscore-prefixed partials of both kinds', async () => {
    const files = {
      'index.md': `---\nlayout: _layout.njk\n---\n# Hi\n`,
      '_layout.njk': '<!doctype html><html><body>{{ content | safe }}</body></html>',
      '_header.njk': '<header>...</header>',
      '_draft.md': '# private',
    };
    const blob = await buildZip(files);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toContain('index.html');
    expect(names).not.toContain('_layout.njk');
    expect(names).not.toContain('_header.njk');
    expect(names).not.toContain('_draft.md');
    expect(names).not.toContain('_draft.html');
  });

  it('applies the template overlay so template files shadow generated ones', async () => {
    const stub: TemplateBundle = {
      id: 'zip-stub',
      name: 'Zip Stub',
      description: '',
      files: {
        '_layout.njk':
          '<!doctype html><html><body><div id="from-template">{{ content | safe }}</div></body></html>',
      },
    };
    TEMPLATES.push(stub);
    try {
      const files = {
        'index.md': `---\nlayout: _layout.njk\n---\n# Hi\n`,
        '_layout.njk':
          '<!doctype html><html><body><div id="from-generated">{{ content | safe }}</div></body></html>',
      };
      const blob = await buildZip(files, 'zip-stub');
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const html = await zip.files['index.html'].async('string');
      expect(html).toContain('from-template');
      expect(html).not.toContain('from-generated');
    } finally {
      TEMPLATES.splice(TEMPLATES.indexOf(stub), 1);
    }
  });
});
