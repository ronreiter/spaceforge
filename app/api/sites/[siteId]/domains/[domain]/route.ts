import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../../lib/auth';
import { removeSiteDomain } from '../../../../../../lib/sites/domains';
import { errorResponse, json } from '../../../../../../lib/api/respond';

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string; domain: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId, domain } = await ctx.params;
    await removeSiteDomain(user, siteId, decodeURIComponent(domain));
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
