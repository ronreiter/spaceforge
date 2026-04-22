import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '../../../../../../lib/auth';
import { getSiteAccess, roleAtLeast, touchSite } from '../../../../../../lib/sites/service';
import { deleteFile, readFile, writeFile } from '../../../../../../lib/sites/files';
import { errorResponse, json } from '../../../../../../lib/api/respond';

// Single-file operations. The catch-all [...path] segment captures
// slashes so paths like `posts/2026-04-22-first.md` round-trip as
// encoded URL path segments.

function joinPath(parts: string[]): string {
  return parts.join('/');
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string; path: string[] }> },
) {
  try {
    const user = await requireUser();
    const { siteId, path: parts } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const path = joinPath(parts);
    const file = await readFile(siteId, path);
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return json({ file });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string; path: string[] }> },
) {
  try {
    const user = await requireUser();
    const { siteId, path: parts } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!roleAtLeast(access.role, 'editor')) {
      return NextResponse.json({ error: 'Read-only access.' }, { status: 403 });
    }
    const body = (await req.json()) as { content?: unknown };
    if (typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Missing { content: string } in body.' },
        { status: 400 },
      );
    }
    const path = joinPath(parts);
    const file = await writeFile(siteId, path, body.content);
    await touchSite(siteId);
    return json({ file });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string; path: string[] }> },
) {
  try {
    const user = await requireUser();
    const { siteId, path: parts } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!roleAtLeast(access.role, 'editor')) {
      return NextResponse.json({ error: 'Read-only access.' }, { status: 403 });
    }
    const path = joinPath(parts);
    await deleteFile(siteId, path);
    await touchSite(siteId);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
