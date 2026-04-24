import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import { getAnalyticsSummary } from '../../../../../lib/sites/analytics';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const summary = await getAnalyticsSummary(user, siteId);
    return json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
