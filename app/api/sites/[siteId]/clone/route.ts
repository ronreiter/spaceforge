import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import { cloneSite } from '../../../../../lib/sites/service';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      slug?: unknown;
      name?: unknown;
    };
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const name = typeof body.name === 'string' ? body.name : '';
    const site = await cloneSite(user, siteId, { slug, name });
    return json({ site }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
