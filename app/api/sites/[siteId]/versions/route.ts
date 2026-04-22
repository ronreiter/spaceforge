import { requireUser } from '../../../../../lib/auth';
import { listVersions } from '../../../../../lib/publish/versions';
import { PublishError } from '../../../../../lib/publish/pipeline';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const versions = await listVersions(user, siteId);
    return json({ versions });
  } catch (err) {
    if (err instanceof PublishError) {
      return json({ error: err.message }, { status: 400 });
    }
    return errorResponse(err);
  }
}
