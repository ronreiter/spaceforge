import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import { getBlobDriver } from '../storage/blob';

// Draft file I/O for a single site. Metadata (path, size, hash,
// blob key) lives in site_files; the bytes live in Blob under
// drafts/<site-id>/<path>.
//
// The content_hash lets the client do optimistic concurrency with
// If-Match semantics — future work, but the plumbing is here now.

export type FileEntry = {
  path: string;
  size: number;
  contentHash: string;
  updatedAt: Date;
};

export type FileContent = FileEntry & {
  content: string; // UTF-8; the site is all text today
};

function draftKey(siteId: string, path: string): string {
  return `drafts/${siteId}/${path}`;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
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
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.avif')) return 'image/avif';
  if (path.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

export async function listFiles(siteId: string): Promise<FileEntry[]> {
  const rows = await db
    .select()
    .from(schema.siteFiles)
    .where(eq(schema.siteFiles.siteId, siteId));
  return rows
    .map((r) => ({
      path: r.path,
      size: r.size,
      contentHash: r.contentHash,
      updatedAt: r.updatedAt,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function readFile(
  siteId: string,
  path: string,
): Promise<FileContent | null> {
  const [row] = await db
    .select()
    .from(schema.siteFiles)
    .where(
      and(eq(schema.siteFiles.siteId, siteId), eq(schema.siteFiles.path, path)),
    )
    .limit(1);
  if (!row) return null;
  const bytes = await getBlobDriver().get(row.blobKey);
  return {
    path: row.path,
    size: row.size,
    contentHash: row.contentHash,
    updatedAt: row.updatedAt,
    content: new TextDecoder('utf-8').decode(bytes),
  };
}

export async function writeFile(
  siteId: string,
  path: string,
  content: string,
): Promise<FileEntry> {
  const key = draftKey(siteId, path);
  const hash = hashContent(content);
  const bytes = new TextEncoder().encode(content);

  await getBlobDriver().put(key, bytes, {
    contentType: contentTypeForPath(path),
  });

  const updatedAt = new Date();
  await db
    .insert(schema.siteFiles)
    .values({
      siteId,
      path,
      blobKey: key,
      size: bytes.byteLength,
      contentHash: hash,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [schema.siteFiles.siteId, schema.siteFiles.path],
      set: {
        blobKey: key,
        size: bytes.byteLength,
        contentHash: hash,
        updatedAt,
      },
    });
  return {
    path,
    size: bytes.byteLength,
    contentHash: hash,
    updatedAt,
  };
}

// Binary write for user-uploaded assets (images, icons). Skips the
// UTF-8 dance that writeFile does since the bytes aren't text.
export async function writeBinaryFile(
  siteId: string,
  path: string,
  bytes: Uint8Array,
): Promise<FileEntry> {
  const key = draftKey(siteId, path);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');

  await getBlobDriver().put(key, bytes, {
    contentType: contentTypeForPath(path),
  });

  const updatedAt = new Date();
  await db
    .insert(schema.siteFiles)
    .values({
      siteId,
      path,
      blobKey: key,
      size: bytes.byteLength,
      contentHash: hash,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [schema.siteFiles.siteId, schema.siteFiles.path],
      set: {
        blobKey: key,
        size: bytes.byteLength,
        contentHash: hash,
        updatedAt,
      },
    });
  return {
    path,
    size: bytes.byteLength,
    contentHash: hash,
    updatedAt,
  };
}

export async function deleteFile(siteId: string, path: string): Promise<void> {
  const [row] = await db
    .select()
    .from(schema.siteFiles)
    .where(
      and(eq(schema.siteFiles.siteId, siteId), eq(schema.siteFiles.path, path)),
    )
    .limit(1);
  if (!row) return;
  await getBlobDriver().delete(row.blobKey);
  await db
    .delete(schema.siteFiles)
    .where(
      and(eq(schema.siteFiles.siteId, siteId), eq(schema.siteFiles.path, path)),
    );
}
