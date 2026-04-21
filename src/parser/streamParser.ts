export type ParserEvent =
  | { type: 'prose'; text: string }
  | { type: 'file-start'; path: string }
  | { type: 'file-chunk'; path: string; text: string }
  | { type: 'file-end'; path: string }
  | { type: 'file-truncated'; path: string };

const FILE_START_RE = /===FILE:\s*([^\s=]+)\s*===\n?/;
const FILE_START_PREFIX = '===FILE:';
const FILE_END = '===END===';

function longestSuffixThatIsPrefixOf(buffer: string, prefix: string): number {
  const max = Math.min(prefix.length, buffer.length);
  for (let i = max; i > 0; i--) {
    if (buffer.endsWith(prefix.slice(0, i))) return i;
  }
  return 0;
}

export class StreamParser {
  private buffer = '';
  private inFile: string | null = null;

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
      this.emit({ type: 'file-truncated', path: this.inFile });
    }
    this.buffer = '';
    this.inFile = null;
  }

  private step(): boolean {
    if (this.inFile === null) {
      const m = this.buffer.match(FILE_START_RE);
      if (m) {
        const idx = m.index!;
        if (idx > 0) this.emit({ type: 'prose', text: this.buffer.slice(0, idx) });
        const path = m[1];
        this.inFile = path;
        this.emit({ type: 'file-start', path });
        this.buffer = this.buffer.slice(idx + m[0].length);
        return true;
      }
      // No complete marker. Work out how much of the tail might still extend
      // into a marker and is therefore unsafe to emit.
      let holdbackStart: number;
      const partialIdx = this.buffer.indexOf(FILE_START_PREFIX);
      if (partialIdx !== -1) {
        // '===FILE:' present but regex didn't match — path or trailing '===' still pending.
        holdbackStart = partialIdx;
      } else {
        const partialLen = longestSuffixThatIsPrefixOf(this.buffer, FILE_START_PREFIX);
        holdbackStart = this.buffer.length - partialLen;
      }
      if (holdbackStart > 0) {
        this.emit({ type: 'prose', text: this.buffer.slice(0, holdbackStart) });
        this.buffer = this.buffer.slice(holdbackStart);
      }
      return false;
    } else {
      const idx = this.buffer.indexOf(FILE_END);
      if (idx !== -1) {
        const body = this.buffer.slice(0, idx);
        if (body) this.emit({ type: 'file-chunk', path: this.inFile, text: body });
        this.emit({ type: 'file-end', path: this.inFile });
        this.inFile = null;
        this.buffer = this.buffer.slice(idx + FILE_END.length);
        return true;
      }
      // Hold back any tail that could still become '===END==='.
      const partialLen = longestSuffixThatIsPrefixOf(this.buffer, FILE_END);
      const safeEnd = this.buffer.length - partialLen;
      if (safeEnd > 0) {
        const body = this.buffer.slice(0, safeEnd);
        this.buffer = this.buffer.slice(safeEnd);
        this.emit({ type: 'file-chunk', path: this.inFile, text: body });
      }
      return false;
    }
  }
}
