// Serialize a front-matter dict + body back to an 11ty-style .md document.
// Uses YAML-ish syntax (one key: value per line) limited to strings, numbers,
// and booleans — the only shapes the model and our templates produce. Strings
// containing special characters are quoted. Keys are emitted in a stable
// order: known content keys first (layout/title/description/date) then the
// rest alphabetized. An empty dict produces no fence block.

const PRIMARY_KEYS = ['layout', 'title', 'description', 'date', 'permalink', 'tags'];

const NEEDS_QUOTE = /[:#&*!|>'"%@`\n{}[\],]/;

function serializeValue(v: unknown): string {
  if (typeof v === 'string') {
    if (v === '') return '""';
    if (NEEDS_QUOTE.test(v) || /^\s|\s$/.test(v) || /^(true|false|null|~)$/i.test(v) || /^-?\d/.test(v)) {
      return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v === null || v === undefined) return '""';
  if (Array.isArray(v)) {
    return `[${v.map(serializeValue).join(', ')}]`;
  }
  // Objects: fall back to JSON-ish; rarely hit in our pipeline.
  return JSON.stringify(v);
}

export function serializeFrontMatter(data: Record<string, unknown>): string {
  const keys = Object.keys(data);
  if (keys.length === 0) return '';
  const ordered = [
    ...PRIMARY_KEYS.filter((k) => k in data),
    ...keys.filter((k) => !PRIMARY_KEYS.includes(k)).sort(),
  ];
  const lines = ordered.map((k) => `${k}: ${serializeValue(data[k])}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export function composeMarkdown(data: Record<string, unknown>, body: string): string {
  const fence = serializeFrontMatter(data);
  const trimmedBody = body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
  return fence ? `${fence}${trimmedBody}` : trimmedBody;
}
