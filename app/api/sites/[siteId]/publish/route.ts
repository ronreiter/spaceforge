import { requireUser } from '../../../../../lib/auth';
import {
  publishSite,
  unpublishSite,
  PublishError,
} from '../../../../../lib/publish/pipeline';
import { errorResponse, json } from '../../../../../lib/api/respond';

// POST /api/sites/:id/publish — compile + upload + pivot.
// DELETE /api/sites/:id/publish — unpublish (leave artifacts, null out
// the pointer).

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const result = await publishSite(user, siteId);
    return json({ result }, { status: 201 });
  } catch (err) {
    if (err instanceof PublishError) {
      return json({ error: err.message }, { status: 400 });
    }
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
    await unpublishSite(user, siteId);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PublishError) {
      return json({ error: err.message }, { status: 400 });
    }
    return errorResponse(err);
  }
}
