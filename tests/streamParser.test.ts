import { describe, it, expect } from 'vitest';
import { StreamParser, type ParserEvent } from '../src/parser/streamParser';

function collect(chunks: string[]): ParserEvent[] {
  const events: ParserEvent[] = [];
  const p = new StreamParser((e) => events.push(e));
  for (const c of chunks) p.feed(c);
  p.end();
  return events;
}

describe('StreamParser', () => {
  it('emits prose only when no file blocks', () => {
    expect(collect(['hello world'])).toEqual([
      { type: 'prose', text: 'hello world' },
    ]);
  });

  it('emits a file block in one chunk', () => {
    const ev = collect(['say hi\n\n===FILE: index.html===\n<p>hi</p>\n===END===\n']);
    expect(ev).toEqual([
      { type: 'prose', text: 'say hi\n\n' },
      { type: 'file-start', path: 'index.html' },
      { type: 'file-chunk', path: 'index.html', text: '<p>hi</p>\n' },
      { type: 'file-end', path: 'index.html' },
      { type: 'prose', text: '\n' },
    ]);
  });

  it('emits file chunks incrementally across chunks', () => {
    const ev = collect([
      '===FILE: a.html===\n',
      '<p>he',
      'llo</p>',
      '\n===END===',
    ]);
    const starts = ev.filter((e) => e.type === 'file-start');
    const ends = ev.filter((e) => e.type === 'file-end');
    expect(starts).toEqual([{ type: 'file-start', path: 'a.html' }]);
    expect(ends).toEqual([{ type: 'file-end', path: 'a.html' }]);
    const body = ev
      .filter((e): e is Extract<ParserEvent, { type: 'file-chunk' }> => e.type === 'file-chunk')
      .map((e) => e.text)
      .join('');
    expect(body).toBe('<p>hello</p>\n');
  });

  it('handles multiple files in one stream', () => {
    const ev = collect([
      '===FILE: a.html===\naaa\n===END===\n',
      '===FILE: b.css===\nbbb\n===END===\n',
    ]);
    expect(ev.filter((e) => e.type === 'file-start').length).toBe(2);
    expect(ev.filter((e) => e.type === 'file-end').length).toBe(2);
  });

  it('emits file-truncated when stream ends mid-file', () => {
    const ev = collect(['===FILE: x.html===\npartial conte']);
    expect(ev.some((e) => e.type === 'file-truncated' && e.path === 'x.html')).toBe(true);
  });

  it('splits markers across chunk boundaries', () => {
    const ev = collect(['===FI', 'LE: a.html', '===\nhi\n===', 'END===']);
    expect(ev.find((e) => e.type === 'file-start')).toEqual({ type: 'file-start', path: 'a.html' });
    expect(ev.find((e) => e.type === 'file-end')).toEqual({ type: 'file-end', path: 'a.html' });
  });
});
