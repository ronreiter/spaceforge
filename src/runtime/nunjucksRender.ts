import nunjucks from 'nunjucks';

// Small models frequently mix up Liquid-style filter syntax (`{{ x | filter:
// "arg" }}`) with Nunjucks's native parenthesised form (`{{ x | filter("arg")
// }}`). Nunjucks' parser hard-errors on the colon form. We normalize it on
// the way into the loader so generated templates that made that mistake still
// render. The rewrite only triggers inside `{{ … }}` so block tags aren't
// touched.
const EXPR_RE = /\{\{([\s\S]*?)\}\}/g;
const FILTER_WITH_COLON_RE = /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^|}]+?)(?=\s*(\||\}\}|$))/g;

export function normalizeLiquidFilters(src: string): string {
  return src.replace(EXPR_RE, (_, inner: string) => {
    const rewritten = inner.replace(FILTER_WITH_COLON_RE, (_m, name: string, args: string) => {
      return `| ${name}(${args.trim()})`;
    });
    return `{{${rewritten}}}`;
  });
}

// Loader that reads template sources from the in-memory file map. Works for
// both the iframe preview and the zip export — Nunjucks pulls `_layout.njk`,
// `_header.njk`, etc. from the same localStorage-backed Record as the pages.
class MemoryLoader extends nunjucks.Loader {
  // Nunjucks' type declares this as a read-only field on subclasses.
  async = false;
  constructor(private files: Record<string, string>) {
    super();
  }
  getSource(name: string): nunjucks.LoaderSource | null {
    const content = this.files[name];
    if (content === undefined) return null;
    return { src: normalizeLiquidFilters(content), path: name, noCache: true };
  }
}

// Format a Date with a small strftime subset so the common `| date("%Y")` /
// `| date("%Y-%m-%d")` the model reaches for actually works. Input can be a
// Date, a number, an ISO string, or the literal "now".
function dateFilter(input: unknown, format?: string): string {
  let d: Date;
  if (input instanceof Date) d = input;
  else if (typeof input === 'number') d = new Date(input);
  else if (typeof input === 'string' && input.toLowerCase() === 'now') d = new Date();
  else if (typeof input === 'string') d = new Date(input);
  else d = new Date();
  if (isNaN(d.getTime())) d = new Date();
  const fmt = format || '%Y-%m-%d';
  const pad = (n: number) => String(n).padStart(2, '0');
  return fmt
    .replace(/%Y/g, String(d.getFullYear()))
    .replace(/%m/g, pad(d.getMonth() + 1))
    .replace(/%d/g, pad(d.getDate()))
    .replace(/%H/g, pad(d.getHours()))
    .replace(/%M/g, pad(d.getMinutes()))
    .replace(/%S/g, pad(d.getSeconds()))
    .replace(/%B/g, d.toLocaleString('en-US', { month: 'long' }))
    .replace(/%b/g, d.toLocaleString('en-US', { month: 'short' }))
    .replace(/%A/g, d.toLocaleString('en-US', { weekday: 'long' }))
    .replace(/%a/g, d.toLocaleString('en-US', { weekday: 'short' }));
}

export function createEnv(files: Record<string, string>): nunjucks.Environment {
  // Nunjucks' Loader is typed as if getSource must always return a source,
  // but the real runtime (and every documented loader example) allows null
  // for "not found". Cast through unknown to bypass the overstrict type.
  const loader = new MemoryLoader(files) as unknown as nunjucks.ILoader;
  const env = new nunjucks.Environment(loader, {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
  });
  env.addFilter('date', dateFilter);
  return env;
}

export function isTemplate(path: string): boolean {
  return path.endsWith('.njk');
}

// Page templates start with a non-underscore letter (index.njk, about.njk).
// Partials/layouts start with an underscore and are NOT rendered directly.
export function isPageTemplate(path: string): boolean {
  if (!isTemplate(path)) return false;
  const base = path.split('/').pop() ?? path;
  return !base.startsWith('_');
}

export function renderTemplate(
  path: string,
  files: Record<string, string>,
  context: Record<string, unknown> = {},
): string {
  const env = createEnv(files);
  return env.render(path, context);
}

// Map a template/markdown source path to its emitted .html equivalent.
// Used at preview (navigating to index.md shows index.html) and at zip
// export time. Supports both .njk (page templates) and .md (markdown pages).
export function outputPath(sourcePath: string): string {
  return sourcePath.replace(/\.(njk|md)$/i, '.html');
}
