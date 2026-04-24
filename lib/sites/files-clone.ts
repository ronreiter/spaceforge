import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import { getBlobDriver } from '../storage/blob';

// Clone every draft file row from one site into another. Downloads
// each source blob and re-uploads under the destination's key prefix
// so the two sites are fully independent — editing the clone never
// mutates the source's bytes.
export async function cloneFilesBetweenSites(
  sourceSiteId: string,
  destSiteId: string,
): Promise<number> {
  const blob = getBlobDriver();
  const rows = await db
    .select()
    .from(schema.siteFiles)
    .where(eq(schema.siteFiles.siteId, sourceSiteId));

  if (rows.length === 0) return 0;

  const inserts = [] as Array<typeof schema.siteFiles.$inferInsert>;
  for (const row of rows) {
    const bytes = await blob.get(row.blobKey);
    const newKey = `drafts/${destSiteId}/${row.path}`;
    await blob.put(newKey, bytes, {
      contentType: contentTypeForPath(row.path),
    });
    inserts.push({
      siteId: destSiteId,
      path: row.path,
      blobKey: newKey,
      size: bytes.byteLength,
      contentHash: row.contentHash || sha256(bytes),
      updatedAt: new Date(),
    });
  }
  await db.insert(schema.siteFiles).values(inserts);
  return inserts.length;
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function contentTypeForPath(path: string): string {
  if (path.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (path.endsWith('.njk') || path.endsWith('.html'))
    return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs'))
    return 'application/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}
