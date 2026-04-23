import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FsBlobDriver } from '../lib/storage/blob/fs';

let tmpRoot: string;
let driver: FsBlobDriver;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spaceforge-blob-'));
  driver = new FsBlobDriver({ root: tmpRoot });
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('FsBlobDriver', () => {
  it('round-trips string content at a slash-heavy key', async () => {
    const res = await driver.put('drafts/site-1/index.md', '# hi\n', {
      contentType: 'text/markdown',
    });
    expect(res.size).toBeGreaterThan(0);
    const bytes = await driver.get('drafts/site-1/index.md');
    expect(new TextDecoder().decode(bytes)).toBe('# hi\n');
  });

  it('round-trips binary Uint8Array', async () => {
    const payload = new Uint8Array([0, 1, 2, 3, 255]);
    await driver.put('drafts/site-1/icon.bin', payload);
    const out = await driver.get('drafts/site-1/icon.bin');
    expect(Array.from(out)).toEqual([0, 1, 2, 3, 255]);
  });

  it('head returns metadata for existing keys, null for missing', async () => {
    await driver.put('drafts/a/x', 'x', { contentType: 'text/plain' });
    const meta = await driver.head('drafts/a/x');
    expect(meta?.size).toBe(1);
    expect(meta?.contentType).toBe('text/plain');
    expect(await driver.head('drafts/a/missing')).toBe(null);
  });

  it('overwrites existing keys', async () => {
    await driver.put('k', 'first');
    await driver.put('k', 'second');
    expect(new TextDecoder().decode(await driver.get('k'))).toBe('second');
  });

  it('delete removes the object and head returns null', async () => {
    await driver.put('k', 'x');
    await driver.delete('k');
    expect(await driver.head('k')).toBe(null);
  });

  it('list filters by prefix and sorts most-recent first', async () => {
    await driver.put('drafts/a/1', '1');
    await new Promise((r) => setTimeout(r, 10));
    await driver.put('drafts/a/2', '22');
    await new Promise((r) => setTimeout(r, 10));
    await driver.put('pub/other/1', 'x');
    const drafts = await driver.list('drafts/');
    expect(drafts.map((b) => b.key)).toEqual(['drafts/a/2', 'drafts/a/1']);
    const pub = await driver.list('pub/');
    expect(pub.map((b) => b.key)).toEqual(['pub/other/1']);
  });

  it('public URL is stable for the same key', async () => {
    const a = await driver.put('drafts/a/1', 'x', { public: true });
    expect(a.publicUrl).not.toBeNull();
    expect(a.publicUrl).toBe(driver.getPublicUrl('drafts/a/1'));
  });

  it('put with public:false returns null publicUrl', async () => {
    const res = await driver.put('drafts/a/1', 'x');
    expect(res.publicUrl).toBe(null);
  });

  it('rejects delete on missing keys without throwing', async () => {
    await expect(driver.delete('nope')).resolves.toBeUndefined();
  });
});
