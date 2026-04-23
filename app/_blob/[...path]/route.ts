import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

// Dev-only: serve files from .spaceforge-local/blob/ to back the URLs
// FsBlobDriver hands out via getPublicUrl() / getSignedReadUrl(). The path
// is <hash>/<hash>.bin (see FsBlobDriver). We look up content-type in the
// sidecar .meta.json living next to the bytes.
//
// In production (VercelBlobDriver), blobs are served by Vercel's CDN and
// this route is never hit — we guard by BLOB_DRIVER.

const ROOT = path.resolve(process.cwd(), '.spaceforge-local', 'blob');

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if ((process.env.BLOB_DRIVER ?? 'fs') !== 'fs') {
    return new NextResponse('Not available — BLOB_DRIVER is not fs', { status: 404 });
  }
  const { path: parts } = await ctx.params;
  if (!parts || parts.length === 0) {
    return new NextResponse('Bad path', { status: 400 });
  }

  const resolved = path.resolve(ROOT, ...parts);
  // Reject any traversal attempts — the resolved path must live inside ROOT.
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const bytes = await fs.readFile(resolved);
    let contentType = 'application/octet-stream';
    // Sidecar metadata lives next to the .bin file.
    if (resolved.endsWith('.bin')) {
      const meta = resolved.replace(/\.bin$/, '.meta.json');
      try {
        const raw = await fs.readFile(meta, 'utf8');
        const m = JSON.parse(raw) as { contentType?: string };
        if (m.contentType) contentType = m.contentType;
      } catch {
        /* no sidecar — ship octet-stream */
      }
    }
    return new NextResponse(bytes, {
      headers: { 'content-type': contentType, 'cache-control': 'no-store' },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('Not found', { status: 404 });
    }
    throw err;
  }
}
