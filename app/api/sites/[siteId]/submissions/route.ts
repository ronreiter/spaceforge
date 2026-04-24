import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  countByFormName,
  listSubmissions,
} from '../../../../../lib/sites/forms';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const url = new URL(req.url);
    const formName = url.searchParams.get('form') ?? undefined;
    const limit = Number(url.searchParams.get('limit') ?? '100') || 100;
    const [submissions, counts] = await Promise.all([
      listSubmissions(user, siteId, { formName, limit }),
      countByFormName(user, siteId),
    ]);
    return json({ submissions, counts });
  } catch (err) {
    return errorResponse(err);
  }
}
