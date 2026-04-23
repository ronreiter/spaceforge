import { requireUser } from '../../../../../../../lib/auth';
import { activateVersion } from '../../../../../../../lib/publish/versions';
import { PublishError } from '../../../../../../../lib/publish/pipeline';
import { errorResponse, json } from '../../../../../../../lib/api/respond';

// POST: pivot sites.published_version_id to an existing version — the
// one-click rollback. Artifacts are already immutable in Blob so this
// is just a pointer swap; no re-render, no new uploads.

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ siteId: string; versionId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId, versionId } = await ctx.params;
    const result = await activateVersion(user, siteId, versionId);
    return json({ result });
  } catch (err) {
    if (err instanceof PublishError) {
      return json({ error: err.message }, { status: 400 });
    }
    return errorResponse(err);
  }
}
