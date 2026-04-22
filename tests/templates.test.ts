import { describe, it, expect } from 'vitest';
import {
  TEMPLATES,
  CUSTOM_TEMPLATE_ID,
  overlayFiles,
  isTemplateOwnedPath,
  getTemplate,
  type TemplateBundle,
} from '../src/templates/registry';
import { renderMarkdownPage } from '../src/runtime/markdownRender';

describe('template registry', () => {
  it('exposes the Custom entry as the default', () => {
    expect(TEMPLATES.some((t) => t.id === CUSTOM_TEMPLATE_ID)).toBe(true);
    const custom = getTemplate(CUSTOM_TEMPLATE_ID);
    expect(custom).toBeDefined();
    expect(custom?.files).toEqual({});
  });
});

describe('overlayFiles', () => {
  const siteFiles = {
    'index.md': '# generated',
    '_layout.njk': '<!-- generated layout -->',
    'styles.css': 'body { color: red }',
  };

  it('returns site files untouched in Custom mode', () => {
    const out = overlayFiles(siteFiles, CUSTOM_TEMPLATE_ID);
    expect(out).toEqual(siteFiles);
  });

  it('returns site files untouched for an unknown template id', () => {
    const out = overlayFiles(siteFiles, 'nonexistent');
    expect(out).toEqual(siteFiles);
  });

  it('each bundled template owns only styles.css', () => {
    const bundled = TEMPLATES.filter((t) => t.id !== CUSTOM_TEMPLATE_ID);
    expect(bundled.length).toBeGreaterThan(0);
    for (const tpl of bundled) {
      expect(Object.keys(tpl.files)).toEqual(['styles.css']);
      expect(tpl.files['styles.css'].length).toBeGreaterThan(200);
    }
  });

  it('each bundled template renders a sample page without Nunjucks errors', () => {
    const sampleMd = `---\nlayout: _layout.njk\ntitle: Hello\ndescription: sample page\n---\n# Hi there\n\nSome paragraph.\n`;
    const stubLayout = `<!DOCTYPE html><html><head><title>{{ title }}</title><link rel="stylesheet" href="styles.css"></head><body><main>{{ content | safe }}</main></body></html>`;
    const templates = TEMPLATES.filter((t) => t.id !== CUSTOM_TEMPLATE_ID);
    for (const tpl of templates) {
      const files = { 'index.md': sampleMd, '_layout.njk': stubLayout, ...tpl.files };
      const rendered = renderMarkdownPage('index.md', files);
      expect(rendered, `template ${tpl.id} produced empty output`).toBeTruthy();
      expect(rendered).toContain('Hi there');
      expect(rendered).toContain('<body');
    }
  });

  it('shadows site files when a template owns the same key', () => {
    const stub: TemplateBundle = {
      id: 'test-stub',
      name: 'Test Stub',
      description: '',
      files: { '_layout.njk': '<!-- stub layout -->' },
    };
    TEMPLATES.push(stub);
    try {
      const out = overlayFiles(siteFiles, 'test-stub');
      expect(out['_layout.njk']).toBe('<!-- stub layout -->');
      expect(out['index.md']).toBe('# generated');
      expect(out['styles.css']).toBe('body { color: red }');
      expect(isTemplateOwnedPath('test-stub', '_layout.njk')).toBe(true);
      expect(isTemplateOwnedPath('test-stub', 'index.md')).toBe(false);
      expect(isTemplateOwnedPath(CUSTOM_TEMPLATE_ID, '_layout.njk')).toBe(false);
    } finally {
      TEMPLATES.splice(TEMPLATES.indexOf(stub), 1);
    }
  });
});
