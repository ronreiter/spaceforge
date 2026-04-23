import { requireUser } from '../../../../../lib/auth';
import { restoreSite } from '../../../../../lib/sites/service';
import { errorResponse, json } from '../../../../../lib/api/respond';

// POST: lift deletedAt so the site reappears in listings.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    await restoreSite(user, siteId);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
