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
