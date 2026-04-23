import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../../lib/auth';
import { removeSiteCollaborator } from '../../../../../../lib/sharing/service';
import { errorResponse, json } from '../../../../../../lib/api/respond';

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string; userId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId, userId } = await ctx.params;
    await removeSiteCollaborator(user, siteId, userId);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
