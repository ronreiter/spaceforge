import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSite,
  saveSite,
  writeFile,
  deleteFile,
  emptySite,
  type SiteState,
} from '../src/storage/files';

beforeEach(() => localStorage.clear());

describe('loadSite / saveSite', () => {
  it('loads empty site when nothing stored', () => {
    const s = loadSite();
    expect(s.files).toEqual({});
    expect(s.chatHistory).toEqual([]);
  });
  it('round-trips a saved site', () => {
    const s: SiteState = {
      ...emptySite(),
      files: { 'index.html': '<p>hi</p>' },
      chatHistory: [{ role: 'user', content: 'hello' }],
    };
    saveSite(s);
    const loaded = loadSite();
    expect(loaded.files['index.html']).toBe('<p>hi</p>');
    expect(loaded.chatHistory).toEqual([{ role: 'user', content: 'hello' }]);
  });
});

describe('writeFile', () => {
  it('writes sanitized paths', () => {
    const s = emptySite();
    const next = writeFile(s, '/foo/bar.html', '<p>hi</p>');
    expect(next.files['bar.html']).toBe('<p>hi</p>');
  });
  it('rejects disallowed extensions', () => {
    const s = emptySite();
    expect(() => writeFile(s, 'evil.php', '<?php')).toThrow(/extension/);
  });
  it('rejects parent-references', () => {
    const s = emptySite();
    expect(() => writeFile(s, '../x.html', '')).toThrow(/invalid/i);
  });
  it('updates updatedAt', async () => {
    const s = emptySite();
    await new Promise((r) => setTimeout(r, 2));
    const next = writeFile(s, 'index.html', 'hi');
    expect(next.updatedAt).toBeGreaterThan(s.updatedAt);
  });
});

describe('deleteFile', () => {
  it('removes a file', () => {
    const s = writeFile(emptySite(), 'a.html', 'a');
    const next = deleteFile(s, 'a.html');
    expect(next.files['a.html']).toBeUndefined();
  });
});
