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

export function sanitizePath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('..')) return null;
  const stripped = trimmed.replace(/^\/+/, '');
  const segments = stripped.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[segments.length - 1];
}

export function isAllowedPath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot <= 0) return false;
  const ext = path.slice(dot).toLowerCase();
  return ALLOWED_EXT.has(ext);
}
