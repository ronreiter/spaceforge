import fm from 'front-matter';

// Shared YAML front-matter parsing. Both the markdown renderer and
// buildCollections need this, and the naive `fm(src)` call throws
// whenever the YAML has an unquoted colon (e.g. `title: Foo: Bar`),
// or the model forgot the fence entirely.
//
// Two small-model shapes we see in the wild, neither of which
// `front-matter` accepts as-is:
//
//   (a) Well-fenced but invalid YAML:
//         ---
//         title: Commute: The Basics    <- second colon breaks YAML 1.2
//         ---
//         # body
//
//   (b) Missing opening fence, closing fence present (or neither):
//         title: About
//         layout: _layout.njk
//         ---
//         # About
//
// In both cases we want to strip the header and return an empty
// attribute map rather than leaving the header in the body.

export type FrontMatter = {
  data: Record<string, unknown>;
  body: string;
};

const FRONT_KV_LINE = /^[A-Za-z_][A-Za-z0-9_\-]*\s*:/;

// Both fences present. Cut on the first pair of --- lines and
// attempt YAML parse; if YAML fails we still return the stripped
// body so the page renders.
function fencedSplit(src: string): { raw: string; body: string } | null {
  if (!src.startsWith('---')) return null;
  const lines = src.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  for (let i = 1; i < Math.min(lines.length, 80); i++) {
    if (lines[i].trim() === '---') {
      return {
        raw: lines.slice(1, i).join('\n'),
        body: lines.slice(i + 1).join('\n'),
      };
    }
  }
  // No closing fence — drop just the opening line so at least the
  // body renders.
  return { raw: '', body: lines.slice(1).join('\n') };
}

// No opening fence. Collect leading `key: value` lines; stop at the
// first `---` line or blank line. Returns null if line 1 isn't a
// key:value line (normal markdown — nothing to strip).
function bareSplit(src: string): { raw: string; body: string } | null {
  if (src.startsWith('---')) return null;
  const lines = src.split(/\r?\n/);
  if (lines.length === 0 || !FRONT_KV_LINE.test(lines[0])) return null;

  let fmEnd = -1;
  let blankEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^---\s*$/.test(line)) {
      fmEnd = i;
      break;
    }
    if (line.trim() === '') {
      blankEnd = i;
      break;
    }
    if (!FRONT_KV_LINE.test(line)) return null;
  }
  if (fmEnd > 0) {
    return {
      raw: lines.slice(0, fmEnd).join('\n'),
      body: lines.slice(fmEnd + 1).join('\n'),
    };
  }
  if (blankEnd > 0) {
    return {
      raw: lines.slice(0, blankEnd).join('\n'),
      body: lines.slice(blankEnd + 1).join('\n'),
    };
  }
  return null;
}

// Last-ditch "dumb" parser: `key: value` per line, splitting on the
// FIRST colon only so `title: Foo: Bar` produces { title: 'Foo: Bar' }.
// Used when front-matter's strict YAML parse rejects an unquoted
// colon. Produces string values only — no nested types, no arrays,
// no true-casts — but that's enough for title/date/layout/permalink,
// which is what small models actually emit.
function naiveYaml(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_\-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let value: string = m[2].trim();
    // Strip one layer of surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

export function parseFrontMatter(src: string): FrontMatter {
  const split = fencedSplit(src) ?? bareSplit(src);
  if (split) {
    const fenced = `---\n${split.raw}\n---\n${split.body}`;
    try {
      const result = fm<Record<string, unknown>>(fenced);
      return { data: result.attributes ?? {}, body: result.body };
    } catch {
      // YAML parse failed (usually an unquoted colon in a value).
      // Fall back to the naive key:value split so title/date/layout
      // still come through instead of being replaced with the filename.
      return { data: naiveYaml(split.raw), body: split.body };
    }
  }
  // No front-matter fence and line 1 isn't key:value — just markdown.
  return { data: {}, body: src };
}
