import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { deleteSite, getSiteAccess, roleAtLeast } from '../../../../lib/sites/service';
import { errorResponse, json } from '../../../../lib/api/respond';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return json({
      site: {
        id: access.site.id,
        slug: access.site.slug,
        name: access.site.name,
        templateId: access.site.templateId,
        teamId: access.site.teamId,
        createdAt: access.site.createdAt,
        updatedAt: access.site.updatedAt,
        publishedAt: access.site.publishedAt,
        publishedVersionId: access.site.publishedVersionId,
      },
      role: access.role,
      via: access.via,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!roleAtLeast(access.role, 'admin')) {
      return NextResponse.json(
        { error: 'Only team admins/owners can delete a site.' },
        { status: 403 },
      );
    }
    await deleteSite(user, siteId);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
