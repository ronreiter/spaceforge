import { del, head, list, put, BlobNotFoundError } from '@vercel/blob';
import type { BlobDriver, BlobMetadata, PutOptions, PutResult } from './types';

// Vercel Blob driver. Used in preview + production when BLOB_DRIVER=vercel.
// Backed by the Vercel Blob store automatically bound to the deployment via
// BLOB_READ_WRITE_TOKEN (provisioned by the Marketplace integration).
//
// Design choices:
//   - Every object is stored with `access: 'public'`. Keys already contain
//     unguessable UUIDs (site-id, version-id) so the URLs act as capability
//     URLs — acceptable for v1, revisit if we need hard isolation.
//   - `addRandomSuffix: false` + `allowOverwrite: true` makes the pathname
//     the authoritative key, so head/get/del by pathname round-trip exactly.
//   - The SDK auto-reads BLOB_READ_WRITE_TOKEN from env — we never pass it
//     explicitly.

export class VercelBlobDriver implements BlobDriver {
  async put(
    key: string,
    body: Uint8Array | string,
    options?: PutOptions,
  ): Promise<PutResult> {
    const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
    const r = await put(key, buf, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: options?.contentType,
    });
    return {
      key,
      size: buf.byteLength,
      publicUrl: options?.public === true ? r.url : null,
    };
  }

  async get(key: string): Promise<Uint8Array> {
    const meta = await headOrNull(key);
    if (!meta) throw new Error(`Blob not found: ${key}`);
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error(`Fetch blob ${key} failed: ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  async head(key: string): Promise<BlobMetadata | null> {
    const m = await headOrNull(key);
    if (!m) return null;
    return {
      key,
      size: m.size,
      contentType: m.contentType,
      uploadedAt: m.uploadedAt,
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await del(key);
    } catch (err) {
      if (err instanceof BlobNotFoundError) return;
      throw err;
    }
  }

  async list(prefix: string): Promise<BlobMetadata[]> {
    const out: BlobMetadata[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      for (const b of r.blobs) {
        out.push({
          key: b.pathname,
          size: b.size,
          contentType: 'application/octet-stream',
          uploadedAt: b.uploadedAt,
        });
      }
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    out.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    return out;
  }

  async getSignedReadUrl(key: string): Promise<string> {
    const m = await headOrNull(key);
    if (!m) throw new Error(`Blob not found: ${key}`);
    return m.url;
  }

  getPublicUrl(): string | null {
    // We can't synthesize the URL from the key alone (it contains the
    // per-store subdomain). Callers that need a URL should read it from
    // the PutResult or call getSignedReadUrl(). Returning null here
    // matches the BlobDriver contract.
    return null;
  }
}

async function headOrNull(pathname: string) {
  try {
    return await head(pathname);
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}
