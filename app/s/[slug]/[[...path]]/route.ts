import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../../../../db/client';
import { getBlobDriver } from '../../../../lib/storage/blob';
import { recordViewBestEffort } from '../../../../lib/sites/analytics';

// Public site serving. Resolves /s/<slug>/<...path> to a blob in
// pub/<slug>/<published_version_id>/<path>. Always versioned so cached
// artifacts are immutable; a new publish just pivots the pointer,
// leaving old paths intact for rollback.

export const dynamic = 'force-dynamic'; // driven by DB lookup each time

function defaultPathFor(parts: string[] | undefined): string {
  if (!parts || parts.length === 0) return 'index.html';
  const joined = parts.join('/');
  // Directory-style URLs get an index.html suffix.
  if (joined.endsWith('/')) return joined + 'index.html';
  // Bare /s/<slug>/about → serve about.html (common 11ty convention).
  if (!/\.[a-z0-9]{1,6}$/i.test(joined)) return joined + '.html';
  return joined;
}

function contentTypeFor(path: string): string {
  if (path.endsWith('.html') || path.endsWith('.htm'))
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
  return 'application/octet-stream';
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path: parts } = await ctx.params;

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.slug, slug))
    .limit(1);
  if (!site || site.deletedAt) {
    // Soft-deleted sites 404 the same as never-existed ones — visitors
    // shouldn't be able to tell a site was trashed.
    return new NextResponse('Site not found', { status: 404 });
  }
  if (!site.publishedVersionId) {
    return new NextResponse(
      `This site has not been published yet.`,
      { status: 404 },
    );
  }

  const resolved = defaultPathFor(parts);

  // Look the artifact up in site_versions' manifest jsonb. Keeps the
  // version id and output path internal; nothing downstream needs to
  // know the blob-key layout.
  const [version] = await db
    .select()
    .from(schema.siteVersions)
    .where(
      and(
        eq(schema.siteVersions.id, site.publishedVersionId),
        eq(schema.siteVersions.siteId, site.id),
      ),
    )
    .limit(1);
  if (!version) {
    return new NextResponse('Version missing', { status: 500 });
  }

  const manifest = version.manifest as Array<{
    outputPath: string;
    blobKey: string;
    size: number;
  }>;
  const entry = manifest.find((a) => a.outputPath === resolved);
  if (!entry) {
    return new NextResponse(`Not found: ${resolved}`, { status: 404 });
  }

  const bytes = await getBlobDriver().get(entry.blobKey);

  // Record a page view. HTML hits only — we don't want to double-count
  // the 20 asset requests that come from a single page load.
  if (resolved.endsWith('.html') || resolved.endsWith('.htm')) {
    recordViewBestEffort({
      siteId: site.id,
      path: '/' + resolved,
      referrer: req.headers.get('referer'),
      userAgent: req.headers.get('user-agent'),
      ip:
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip'),
      host: req.headers.get('host'),
    });
  }

  // NextResponse wants BodyInit; Buffer.from(Uint8Array) gives us a
  // node-friendly Buffer that matches the expected type.
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'content-type': contentTypeFor(resolved),
      // Short edge TTL + SWR. The URL path isn't version-scoped — only
      // the underlying blob key is — so `immutable` here would mean
      // republishes never propagate. 60s is short enough that edits
      // show up "right after publish" without hammering the origin.
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
