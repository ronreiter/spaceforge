import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { BlobDriver, BlobMetadata, PutOptions, PutResult } from './types';

// Filesystem-backed blob driver for local dev. No network, no Docker, no
// cloud credentials — just a directory under the repo root.
//
// Layout:
//   <root>/
//     blobs/<sha256-of-key>/<sha256-of-key>.bin        -- bytes
//     blobs/<sha256-of-key>/<sha256-of-key>.meta.json  -- metadata sidecar
//
// We hash the key so arbitrary slashes/special chars don't become nested
// directories (and so listing stays cheap — one shallow directory).
//
// `getPublicUrl()` returns a /_blob/<sha>/<sha>.bin URL. A Next.js Route
// Handler at app/_blob/[...path]/route.ts streams those in dev — installed
// alongside the driver. In prod we swap to VercelBlobDriver and real
// CDN URLs.

const DEFAULT_ROOT = path.resolve(process.cwd(), '.spaceforge-local', 'blob');

type MetaSidecar = {
  key: string;
  contentType: string;
  size: number;
  uploadedAt: string; // ISO
  public: boolean;
};

function hash(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export class FsBlobDriver implements BlobDriver {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(opts?: { root?: string; publicBaseUrl?: string }) {
    this.root = opts?.root ?? DEFAULT_ROOT;
    // Served by app/_blob/[...]/route.ts in dev.
    this.publicBaseUrl = opts?.publicBaseUrl ?? '/_blob';
  }

  private paths(key: string) {
    const h = hash(key);
    const dir = path.join(this.root, h);
    return {
      dir,
      bytes: path.join(dir, `${h}.bin`),
      meta: path.join(dir, `${h}.meta.json`),
      h,
    };
  }

  private async ensureRoot(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async put(
    key: string,
    body: Uint8Array | string,
    options?: PutOptions,
  ): Promise<PutResult> {
    await this.ensureRoot();
    const p = this.paths(key);
    await fs.mkdir(p.dir, { recursive: true });
    const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
    await fs.writeFile(p.bytes, buf);
    const meta: MetaSidecar = {
      key,
      contentType: options?.contentType ?? 'application/octet-stream',
      size: buf.byteLength,
      uploadedAt: new Date().toISOString(),
      public: options?.public === true,
    };
    await fs.writeFile(p.meta, JSON.stringify(meta));
    return {
      key,
      size: buf.byteLength,
      publicUrl: meta.public ? this.buildPublicUrl(p.h) : null,
    };
  }

  async get(key: string): Promise<Uint8Array> {
    const p = this.paths(key);
    const buf = await fs.readFile(p.bytes);
    return new Uint8Array(buf);
  }

  async head(key: string): Promise<BlobMetadata | null> {
    const p = this.paths(key);
    try {
      const raw = await fs.readFile(p.meta, 'utf8');
      const m = JSON.parse(raw) as MetaSidecar;
      return {
        key: m.key,
        size: m.size,
        contentType: m.contentType,
        uploadedAt: new Date(m.uploadedAt),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const p = this.paths(key);
    await fs.rm(p.dir, { recursive: true, force: true });
  }

  async list(prefix: string): Promise<BlobMetadata[]> {
    await this.ensureRoot();
    let entries: string[];
    try {
      entries = await fs.readdir(this.root);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: BlobMetadata[] = [];
    for (const entry of entries) {
      const metaPath = path.join(this.root, entry, `${entry}.meta.json`);
      try {
        const raw = await fs.readFile(metaPath, 'utf8');
        const m = JSON.parse(raw) as MetaSidecar;
        if (m.key.startsWith(prefix)) {
          out.push({
            key: m.key,
            size: m.size,
            contentType: m.contentType,
            uploadedAt: new Date(m.uploadedAt),
          });
        }
      } catch {
        // skip corrupt/partial entries
      }
    }
    out.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    return out;
  }

  async getSignedReadUrl(key: string): Promise<string> {
    // No real signing in the dev driver — the URL is just the public
    // path; the dev route handler enforces auth at request time.
    return this.buildPublicUrl(hash(key));
  }

  getPublicUrl(key: string): string | null {
    // We don't know from just the key whether the object was stored as
    // public. Caller is responsible for only calling this on public
    // objects — mirrors Vercel Blob's behavior (every object you put has
    // a URL; you control access with `access: 'public' | 'private'`).
    return this.buildPublicUrl(hash(key));
  }

  private buildPublicUrl(h: string): string {
    return `${this.publicBaseUrl}/${h}/${h}.bin`;
  }
}
