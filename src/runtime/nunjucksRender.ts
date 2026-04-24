import nunjucks from 'nunjucks';
import fm from 'front-matter';

// Small models frequently mix up Liquid-style filter syntax (`{{ x | filter:
// "arg" }}`) with Nunjucks's native parenthesised form (`{{ x | filter("arg")
// }}`). Nunjucks' parser hard-errors on the colon form. We also see method-
// call syntax imported from JS / moment.js (`| date.format("%Y")`), which
// Nunjucks reads as a filter literally named "date.format" and complains
// about. Both rewrites run on the way into the loader so generated
// templates that made those mistakes still render. Rewrites only trigger
// inside `{{ … }}` so block tags aren't touched.
const EXPR_RE = /\{\{([\s\S]*?)\}\}/g;
const FILTER_WITH_COLON_RE = /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^|}]+?)(?=\s*(\||\}\}|$))/g;
const FILTER_WITH_METHOD_RE = /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;

export function normalizeLiquidFilters(src: string): string {
  return src.replace(EXPR_RE, (_, inner: string) => {
    let rewritten = inner.replace(FILTER_WITH_COLON_RE, (_m, name: string, args: string) => {
      return `| ${name}(${args.trim()})`;
    });
    // `| date.format(...)` → `| date(...)`. Nunjucks filter names are single
    // identifiers; a `.method` chain must be discarded for the call to parse.
    rewritten = rewritten.replace(FILTER_WITH_METHOD_RE, (_m, name: string) => `| ${name}(`);
    return `{{${rewritten}}}`;
  });
}

// Small models sometimes prepend YAML-style front-matter fences to .njk
// files (mixing up the .md convention). Nunjucks treats those lines as
// plain text, so they appear literally at the top of the rendered page.
// Strip a leading `---\n...---\n` block, or a lone leading `---\n` line,
// from template sources before they reach the parser.
function stripLeadingFrontMatter(src: string): string {
  if (!src.startsWith('---')) return src;
  const lines = src.split(/\r?\n/);
  if (lines[0].trim() !== '---') return src;
  // Look for a matching closing fence within the first ~20 lines.
  for (let i = 1; i < Math.min(lines.length, 40); i++) {
    if (lines[i].trim() === '---') {
      return lines.slice(i + 1).join('\n');
    }
  }
  // No closing fence — model probably just stuck a lone `---\n` at the top.
  // Drop only that first line.
  return lines.slice(1).join('\n');
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
    const cleaned = stripLeadingFrontMatter(content);
    return { src: normalizeLiquidFilters(cleaned), path: name, noCache: true };
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
  // Aliases for common date-formatting filter names the model reaches for.
  // All route through the same strftime-subset formatter so the user sees
  // something sensible regardless of which name the model picked.
  env.addFilter('strftime', dateFilter);
  env.addFilter('formatDate', dateFilter);
  env.addFilter('format_date', dateFilter);
  env.addFilter('dateFormat', dateFilter);
  return env;
}

export function isTemplate(path: string): boolean {
  return path.endsWith('.njk');
}

// Build the `collections` object exposed to Nunjucks templates:
//   { posts: [{title, date, url, excerpt, ...frontMatter}, ...], ... }
// Keys are every top-level directory that contains at least one .md
// file, excluding partials (_*.md).
//
// Parses front matter with `front-matter` directly (not
// markdownRender.parseFrontMatter) to avoid a circular import —
// markdownRender already depends on this file for outputPath.
export function buildCollections(files: Record<string, string>): Record<
  string,
  Array<Record<string, unknown>>
> {
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  for (const [path, src] of Object.entries(files)) {
    const slashIdx = path.indexOf('/');
    if (slashIdx <= 0) continue;
    if (!path.endsWith('.md')) continue;
    const base = path.split('/').pop() ?? path;
    if (base.startsWith('_')) continue;
    // The collection's own index page (posts/index.md) lists the
    // collection — it's not itself a post. Skip it.
    if (base === 'index.md') continue;
    const dir = path.slice(0, slashIdx);

    let data: Record<string, unknown> = {};
    let body = src;
    try {
      const parsed = fm<Record<string, unknown>>(src);
      data = parsed.attributes ?? {};
      body = parsed.body;
    } catch {
      // Malformed front matter — treat the whole thing as body. The
      // editor's markdownRender.parseFrontMatter already handles this
      // case too; we don't want a bad page to drop the whole
      // collection.
    }

    const excerpt = body
      .replace(/^#.*$/m, '')
      .trim()
      .slice(0, 180);
    const url = outputPath(path);
    const item: Record<string, unknown> = {
      ...data,
      path,
      url,
      excerpt,
      title: typeof data.title === 'string' ? data.title : base,
    };
    if (!grouped[dir]) grouped[dir] = [];
    grouped[dir].push(item);
  }
  // Sort each collection by date desc (fallback: title asc). YAML
  // auto-parses ISO dates into Date objects, so we accept both Date
  // and string and coerce to a sortable number.
  const asTime = (v: unknown): number => {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return isNaN(t) ? 0 : t;
    }
    return 0;
  };
  for (const dir of Object.keys(grouped)) {
    grouped[dir].sort((a, b) => {
      const diff = asTime(b.date) - asTime(a.date);
      if (diff !== 0) return diff;
      return String(a.title).localeCompare(String(b.title));
    });
  }
  return grouped;
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
  // Inject `collections` automatically so standalone .njk pages can
  // iterate over blog posts etc. without the caller having to build
  // it. An explicit context value wins if one was passed in.
  const merged = { collections: buildCollections(files), ...context };
  return env.render(path, merged);
}

// Map a template/markdown source path to its emitted .html equivalent.
// Used at preview (navigating to index.md shows index.html) and at zip
// export time. Supports both .njk (page templates) and .md (markdown pages).
export function outputPath(sourcePath: string): string {
  return sourcePath.replace(/\.(njk|md)$/i, '.html');
}
