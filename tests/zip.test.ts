import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildZip } from '../src/storage/zip';

describe('buildZip', () => {
  it('produces a zip containing every file', async () => {
    const blob = await buildZip({ 'index.html': '<p>a</p>', 'styles.css': 'body{}' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(['index.html', 'styles.css']);
    expect(await zip.files['index.html'].async('string')).toBe('<p>a</p>');
  });
});
