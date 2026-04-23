import type { NextRequest } from 'next/server';
import { requireUser } from '../../../lib/auth';
import { createSite, listSitesForUser } from '../../../lib/sites/service';
import { errorResponse, json } from '../../../lib/api/respond';

export async function GET() {
  try {
    const user = await requireUser();
    const sites = await listSitesForUser(user);
    return json({ sites });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      slug?: unknown;
      name?: unknown;
      templateId?: unknown;
    };
    const site = await createSite(user, {
      slug: String(body.slug ?? ''),
      name: String(body.name ?? ''),
      templateId:
        typeof body.templateId === 'string' ? body.templateId : undefined,
    });
    return json({ site }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
