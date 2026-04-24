import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  getSiteAccess,
  roleAtLeast,
  touchSite,
  ValidationError,
} from '../../../../../lib/sites/service';
import { writeBinaryFile } from '../../../../../lib/sites/files';
import { isAllowedPath, isBinaryPath } from '../../../../../src/storage/paths';
import { errorResponse, json } from '../../../../../lib/api/respond';

// Multipart upload endpoint for user-supplied image assets.
//
// The filename that lands in the site is the File.name sanitized down
// to a flat, lowercased slug plus its original extension. Duplicate
// names upsert — the existing site_files row is overwritten so a
// user can re-upload under the same name to replace an image.

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 20;

function sanitizeAssetName(original: string): string | null {
  // Strip any directories, lowercase, replace whitespace / unsafe chars
  // with hyphens, collapse repeats. Then require an allowed binary
  // extension.
  const base = original.split(/[\\/]/).pop() ?? '';
  if (!base) return null;
  const dotIdx = base.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const stem = base
    .slice(0, dotIdx)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const ext = base.slice(dotIdx).toLowerCase();
  if (!stem) return null;
  const full = `${stem}${ext}`;
  if (!isAllowedPath(full) || !isBinaryPath(full)) return null;
  return full;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) throw new ValidationError('Site not found.');
    if (!roleAtLeast(access.role, 'editor')) {
      throw new ValidationError('Read-only access.');
    }

    const form = await req.formData();
    const incoming: Array<{ file: File; path: string }> = [];
    let count = 0;
    for (const [key, value] of form.entries()) {
      if (!(value instanceof File)) continue;
      if (count++ >= MAX_FILES) break;
      if (value.size > MAX_BYTES) {
        throw new ValidationError(
          `"${value.name}" is larger than 10 MB; compress it before uploading.`,
        );
      }
      const safe = sanitizeAssetName(value.name);
      if (!safe) {
        throw new ValidationError(
          `"${value.name}" is not a supported image format (png, jpg, gif, webp, avif, svg, ico).`,
        );
      }
      incoming.push({ file: value, path: safe });
      void key;
    }
    if (incoming.length === 0) {
      throw new ValidationError('No files in the upload.');
    }

    const saved: Array<{ path: string; size: number }> = [];
    for (const { file, path } of incoming) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const entry = await writeBinaryFile(siteId, path, bytes);
      saved.push({ path: entry.path, size: entry.size });
    }
    await touchSite(siteId);
    return json({ assets: saved }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
