import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  addSiteCollaborator,
  listSiteCollaborators,
  type CollabRole,
} from '../../../../../lib/sharing/service';
import { errorResponse, json } from '../../../../../lib/api/respond';

const VALID_ROLES: CollabRole[] = ['editor', 'viewer'];

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const collaborators = await listSiteCollaborators(user, siteId);
    return json({ collaborators });
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
    const body = (await req.json()) as { email?: unknown; role?: unknown };
    const email = typeof body.email === 'string' ? body.email : '';
    const role =
      typeof body.role === 'string' && (VALID_ROLES as string[]).includes(body.role)
        ? (body.role as CollabRole)
        : 'editor';
    const collaborator = await addSiteCollaborator(user, siteId, email, role);
    return json({ collaborator }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
