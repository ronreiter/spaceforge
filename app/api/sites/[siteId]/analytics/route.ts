import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  getAnalyticsSummary,
  type AnalyticsRange,
} from '../../../../../lib/sites/analytics';
import { errorResponse, json } from '../../../../../lib/api/respond';

const VALID_RANGES: AnalyticsRange[] = ['24h', '7d', '30d', '90d', 'custom'];

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get('range');
    const range =
      rangeParam && (VALID_RANGES as string[]).includes(rangeParam)
        ? (rangeParam as AnalyticsRange)
        : '30d';
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const summary = await getAnalyticsSummary(user, siteId, { range, from, to });
    return json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
