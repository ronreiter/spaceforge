const ALLOWED_EXT = new Set(['.html', '.css', '.js', '.svg', '.json', '.txt', '.md']);

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
