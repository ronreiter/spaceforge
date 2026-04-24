import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../../../db/client';
import { requireUser } from '../../../../../lib/auth';
import {
  getSiteAccess,
  roleAtLeast,
  ValidationError,
} from '../../../../../lib/sites/service';
import { FAVICON_PALETTE } from '../../../../../lib/favicon/palette';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const access = await getSiteAccess(user, siteId);
    if (!access) throw new ValidationError('Site not found.');
    return json({ favicon: access.site.faviconIcon ?? null });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
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
    const body = (await req.json().catch(() => ({}))) as { icon?: unknown };
    const icon = typeof body.icon === 'string' ? body.icon : null;
    if (icon && !FAVICON_PALETTE.includes(icon)) {
      throw new ValidationError(`"${icon}" is not in the favicon palette.`);
    }
    await db
      .update(schema.sites)
      .set({ faviconIcon: icon })
      .where(eq(schema.sites.id, siteId));
    return json({ favicon: icon });
  } catch (err) {
    return errorResponse(err);
  }
}
