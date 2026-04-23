import { describe, it, expect } from 'vitest';
import {
  normalizeLiquidFilters,
  createEnv,
  outputPath,
  renderTemplate,
} from '../src/runtime/nunjucksRender';

describe('normalizeLiquidFilters', () => {
  it('rewrites `| date: "%Y"` to `| date("%Y")`', () => {
    const out = normalizeLiquidFilters('{{ "now" | date: "%Y" }}');
    expect(out).toBe('{{ "now" | date("%Y") }}');
  });

  it('handles multiple filters on the same expression', () => {
    const out = normalizeLiquidFilters('{{ x | foo: 1 | bar: "y" }}');
    expect(out).toBe('{{ x | foo(1) | bar("y") }}');
  });

  it('leaves non-expression text untouched', () => {
    const src = '{% if a %}\n{{ x | date: "%Y" }}\n{% endif %}';
    const out = normalizeLiquidFilters(src);
    expect(out).toContain('{% if a %}');
    expect(out).toContain('{{ x | date("%Y") }}');
  });

  it('strips method-call syntax from filter names', () => {
    const out = normalizeLiquidFilters('{{ "now" | date.format("%Y") }}');
    expect(out).toBe('{{ "now" | date("%Y") }}');
  });

  it('handles method-call chain with other filters', () => {
    const out = normalizeLiquidFilters('{{ x | date.format("%Y") | upper }}');
    expect(out).toBe('{{ x | date("%Y") | upper }}');
  });
});

describe('date filter aliases', () => {
  it('accepts `| strftime(...)` as a date filter', () => {
    const env = createEnv({});
    const out = env.renderString('{{ "2025-06-15" | strftime("%Y") }}', {});
    expect(out).toBe('2025');
  });

  it('accepts `| formatDate(...)` as a date filter', () => {
    const env = createEnv({});
    const out = env.renderString('{{ "2025-06-15" | formatDate("%Y") }}', {});
    expect(out).toBe('2025');
  });

  it('renders `| date.format(...)` through a template after normalization', () => {
    const files = {
      '_footer.njk': `<footer>{{ "now" | date.format("%Y") }}</footer>`,
    };
    const rendered = renderTemplate('_footer.njk', files, {});
    expect(rendered).toMatch(/\d{4}/);
  });
});

describe('date filter', () => {
  it('formats "now" as YYYY by default', () => {
    const env = createEnv({});
    const out = env.renderString('{{ "now" | date("%Y") }}', {});
    expect(out).toMatch(/^\d{4}$/);
  });

  it('formats a parsed ISO date', () => {
    const env = createEnv({});
    const out = env.renderString('{{ "2025-06-15" | date("%Y-%m-%d") }}', {});
    expect(out).toBe('2025-06-15');
  });

  it('works after Liquid-style normalization via a rendered template', () => {
    const files = {
      '_footer.njk': `<footer><p>{{ "now" | date: "%Y" }} Site</p></footer>`,
    };
    const rendered = renderTemplate('_footer.njk', files, {});
    expect(rendered).toMatch(/\d{4} Site/);
  });
});

describe('stripping stray front matter from .njk files', () => {
  it('strips a leading --- fenced block from a njk template', () => {
    const files = {
      '_layout.njk':
        '---\nsomething: whatever\n---\n<!DOCTYPE html><html><body>{{ content | safe }}</body></html>',
    };
    const rendered = renderTemplate('_layout.njk', files, { content: 'hi' });
    expect(rendered.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(rendered).not.toContain('---');
  });

  it('strips a lone leading --- line when there is no closing fence', () => {
    const files = {
      '_header.njk': '---\n<header><h1>Studio</h1></header>',
    };
    const rendered = renderTemplate('_header.njk', files, {});
    expect(rendered.startsWith('<header>')).toBe(true);
    expect(rendered).not.toContain('---');
  });

  it('leaves templates without a leading --- alone', () => {
    const files = {
      '_footer.njk': '<footer>© site</footer>',
    };
    expect(renderTemplate('_footer.njk', files, {})).toBe('<footer>© site</footer>');
  });
});

describe('outputPath', () => {
  it('maps .md to .html', () => {
    expect(outputPath('index.md')).toBe('index.html');
  });
  it('maps .njk to .html', () => {
    expect(outputPath('index.njk')).toBe('index.html');
  });
  it('leaves other paths alone', () => {
    expect(outputPath('styles.css')).toBe('styles.css');
  });
});
