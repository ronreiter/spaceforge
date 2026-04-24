import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  addSiteDomain,
  listSiteDomains,
} from '../../../../../lib/sites/domains';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const domains = await listSiteDomains(user, siteId);
    return json({ domains });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const body = (await req.json()) as { domain?: unknown };
    const domain = typeof body.domain === 'string' ? body.domain : '';
    const added = await addSiteDomain(user, siteId, domain);
    return json({ domain: added }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
