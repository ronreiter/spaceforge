import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import { getSiteAccess, roleAtLeast, touchSite } from '../../../../../lib/sites/service';
import { listFiles, writeFile } from '../../../../../lib/sites/files';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const files = await listFiles(siteId);
    return json({ files });
  } catch (err) {
    return errorResponse(err);
  }
}

// Bulk upsert: PUT { files: { "index.md": "...", "styles.css": "..." } }
// Missing paths are NOT deleted — this is additive so partial saves don't
// wipe files the client hasn't sent.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!roleAtLeast(access.role, 'editor')) {
      return NextResponse.json(
        { error: 'Read-only access.' },
        { status: 403 },
      );
    }
    const body = (await req.json()) as { files?: Record<string, unknown> };
    if (!body.files || typeof body.files !== 'object') {
      return NextResponse.json(
        { error: 'Missing { files: {...} } in body.' },
        { status: 400 },
      );
    }
    const written = [];
    for (const [path, content] of Object.entries(body.files)) {
      if (typeof content !== 'string') continue;
      if (path.length === 0 || path.includes('\0') || path.startsWith('/')) {
        return NextResponse.json(
          { error: `Invalid path: ${JSON.stringify(path)}` },
          { status: 400 },
        );
      }
      written.push(await writeFile(siteId, path, content));
    }
    await touchSite(siteId);
    return json({ files: written });
  } catch (err) {
    return errorResponse(err);
  }
}
