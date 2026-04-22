export type ParserEvent =
  | { type: 'prose'; text: string }
  | { type: 'file-start'; path: string }
  | { type: 'file-chunk'; path: string; text: string }
  | { type: 'file-end'; path: string }
  | { type: 'file-truncated'; path: string };

// Canonical protocol — what the system prompt asks for:
//   ===FILE: path===
//   <body>
//   ===END===
const CANON_START_RE = /===FILE:\s*([^\s=]+)\s*===\n?/;
const CANON_START_PREFIX = '===FILE:';
const CANON_END = '===END===';

// Markdown-fenced variant — common fallback from code-tuned models:
//   ### FILE: path
//   ```lang
//   <body>
//   ```
const MD_START_RE = /###\s*FILE:\s*(\S+)\s*\r?\n+```[^\n]*\r?\n/;
const MD_START_PREFIX = '### FILE:';
const MD_END_RE = /\r?\n```[ \t]*(?=\r?\n|$)/;

// Prefixes whose partial suffixes we must hold back inside a file body —
// any of them could grow into a real close signal in the next chunk.
const HOLDBACK_PREFIXES = [CANON_END, CANON_START_PREFIX, MD_START_PREFIX, '\n```'];

type Variant = 'canonical' | 'markdown';

function longestSuffixThatIsPrefixOf(buffer: string, prefix: string): number {
  const max = Math.min(prefix.length, buffer.length);
  for (let i = max; i > 0; i--) {
    if (buffer.endsWith(prefix.slice(0, i))) return i;
  }
  return 0;
}

type StartMatch = { index: number; consumed: number; path: string; variant: Variant };

function firstStartMatch(buffer: string): StartMatch | null {
  const canon = buffer.match(CANON_START_RE);
  const md = buffer.match(MD_START_RE);
  const canonIdx = canon?.index ?? Infinity;
  const mdIdx = md?.index ?? Infinity;
  if (canon && canonIdx <= mdIdx) {
    return {
      index: canonIdx as number,
      consumed: (canonIdx as number) + canon[0].length,
      path: canon[1],
      variant: 'canonical',
    };
  }
  if (md) {
    return {
      index: mdIdx as number,
      consumed: (mdIdx as number) + md[0].length,
      path: md[1],
      variant: 'markdown',
    };
  }
  return null;
}

function findExplicitEnd(
  buffer: string,
  variant: Variant,
): { at: number; length: number } | null {
  if (variant === 'canonical') {
    const idx = buffer.indexOf(CANON_END);
    return idx >= 0 ? { at: idx, length: CANON_END.length } : null;
  }
  const m = buffer.match(MD_END_RE);
  if (m && m.index !== undefined) return { at: m.index, length: m[0].length };
  return null;
}

export class StreamParser {
  private buffer = '';
  private inFile: string | null = null;
  private variant: Variant = 'canonical';

  constructor(private emit: (ev: ParserEvent) => void) {}

  feed(chunk: string): void {
    this.buffer += chunk;
    while (this.step()) {
      /* iterate until no more events can be emitted */
    }
  }

  end(): void {
    if (this.inFile === null) {
      if (this.buffer) this.emit({ type: 'prose', text: this.buffer });
    } else {
      // Flush held-back tail so the caller's buffer matches every byte the
      // model emitted. App.tsx decides (via looksComplete) whether to warn.
      if (this.buffer) {
        this.emit({ type: 'file-chunk', path: this.inFile, text: this.buffer });
      }
      this.emit({ type: 'file-truncated', path: this.inFile });
    }
    this.buffer = '';
    this.inFile = null;
  }

  private step(): boolean {
    if (this.inFile === null) {
      const match = firstStartMatch(this.buffer);
      if (match) {
        if (match.index > 0) {
          this.emit({ type: 'prose', text: this.buffer.slice(0, match.index) });
        }
        this.inFile = match.path;
        this.variant = match.variant;
        this.emit({ type: 'file-start', path: match.path });
        this.buffer = this.buffer.slice(match.consumed);
        return true;
      }
      // No complete start marker yet. Hold back any tail that could still
      // grow into one of either variant.
      const partialCanon = this.buffer.indexOf(CANON_START_PREFIX);
      const partialMd = this.buffer.indexOf(MD_START_PREFIX);
      const partialIdx =
        partialCanon !== -1 && (partialMd === -1 || partialCanon < partialMd)
          ? partialCanon
          : partialMd;
      let holdbackStart: number;
      if (partialIdx !== -1) {
        holdbackStart = partialIdx;
      } else {
        const canonTail = longestSuffixThatIsPrefixOf(this.buffer, CANON_START_PREFIX);
        const mdTail = longestSuffixThatIsPrefixOf(this.buffer, MD_START_PREFIX);
        holdbackStart = this.buffer.length - Math.max(canonTail, mdTail);
      }
      if (holdbackStart > 0) {
        this.emit({ type: 'prose', text: this.buffer.slice(0, holdbackStart) });
        this.buffer = this.buffer.slice(holdbackStart);
      }
      return false;
    }
    return this.stepInFile();
  }

  private stepInFile(): boolean {
    if (this.inFile === null) return false;

    // A file can close either explicitly (===END=== / closing ``` fence) or
    // implicitly when the next ===FILE: / ### FILE: start appears — models
    // often skip the end marker and just move on to the next block.
    const explicit = findExplicitEnd(this.buffer, this.variant);
    const nextStart = firstStartMatch(this.buffer);

    let close: { at: number; consume: number } | null = null;
    if (explicit && (!nextStart || explicit.at <= nextStart.index)) {
      close = { at: explicit.at, consume: explicit.length };
    } else if (nextStart) {
      // Leave the next start marker in the buffer so the top-level step()
      // can re-enter and emit file-start for it.
      close = { at: nextStart.index, consume: 0 };
    }

    if (close) {
      const body = this.buffer.slice(0, close.at);
      if (body) this.emit({ type: 'file-chunk', path: this.inFile, text: body });
      this.emit({ type: 'file-end', path: this.inFile });
      this.inFile = null;
      this.buffer = this.buffer.slice(close.at + close.consume);
      return true;
    }

    // Neither close signal present. Hold back the tail that could still grow
    // into any of them, emit the safe prefix as a file chunk.
    let tail = 0;
    for (const p of HOLDBACK_PREFIXES) {
      const t = longestSuffixThatIsPrefixOf(this.buffer, p);
      if (t > tail) tail = t;
    }
    const safeEnd = this.buffer.length - tail;
    if (safeEnd > 0) {
      const body = this.buffer.slice(0, safeEnd);
      this.buffer = this.buffer.slice(safeEnd);
      this.emit({ type: 'file-chunk', path: this.inFile, text: body });
    }
    return false;
  }
}
