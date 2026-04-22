import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../../lib/auth';
import {
  changeTeamMemberRole,
  removeTeamMember,
  type TeamRole,
} from '../../../../../../lib/sharing/service';
import { errorResponse, json } from '../../../../../../lib/api/respond';

const VALID_ROLES: TeamRole[] = ['admin', 'editor', 'viewer'];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await requireUser();
    const { userId } = await ctx.params;
    const body = (await req.json()) as { role?: unknown };
    if (
      typeof body.role !== 'string' ||
      !(VALID_ROLES as string[]).includes(body.role)
    ) {
      return json({ error: 'role must be one of admin, editor, viewer' }, { status: 400 });
    }
    await changeTeamMemberRole(user, userId, body.role as TeamRole);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await requireUser();
    const { userId } = await ctx.params;
    await removeTeamMember(user, userId);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
