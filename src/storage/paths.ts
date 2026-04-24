const ALLOWED_EXT = new Set([
  // Text / markup
  '.html', '.css', '.js', '.svg', '.json', '.txt', '.md', '.njk',
  // Raster images uploaded by the user (public via /s/<slug>/<path>)
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico',
]);

// Extensions that are stored as raw bytes and copied as-is at publish
// time (no markdown/Nunjucks rendering). Keep in sync with ALLOWED_EXT.
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico']);

export function isBinaryPath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot <= 0) return false;
  return BINARY_EXT.has(path.slice(dot).toLowerCase());
}

// Directory names at the top level that are allowed in a generated
// site. Used for collections (posts/, projects/, recipes/, etc.) and
// other grouped content. Additions to this list unlock new collection
// types without widening the general "anything goes" surface area.
const ALLOWED_DIRS = new Set([
  'posts',
  'projects',
  'recipes',
  'events',
  'notes',
  'docs',
]);

export function isAllowedDir(dir: string): boolean {
  return ALLOWED_DIRS.has(dir);
}

// Allows one level of directory nesting for collection content when
// the leading directory is in ALLOWED_DIRS. Everything else is
// flattened to its basename, keeping the surface small.
export function sanitizePath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('..')) return null;
  const stripped = trimmed.replace(/^\/+/, '');
  const segments = stripped.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];
  if (segments.length === 2 && isAllowedDir(segments[0])) {
    return `${segments[0]}/${segments[1]}`;
  }
  // Deeper nesting or an unapproved top-level directory falls back
  // to the flat-path convention.
  return segments[segments.length - 1];
}

export function isAllowedPath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot <= 0) return false;
  const ext = path.slice(dot).toLowerCase();
  return ALLOWED_EXT.has(ext);
}
