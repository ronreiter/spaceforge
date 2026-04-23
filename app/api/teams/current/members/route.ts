import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  addTeamMember,
  listTeamMembers,
  type TeamRole,
} from '../../../../../lib/sharing/service';
import { errorResponse, json } from '../../../../../lib/api/respond';

const VALID_ROLES: TeamRole[] = ['admin', 'editor', 'viewer'];

export async function GET() {
  try {
    const user = await requireUser();
    const members = await listTeamMembers(user);
    return json({ members });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { email?: unknown; role?: unknown };
    const email = typeof body.email === 'string' ? body.email : '';
    const role =
      typeof body.role === 'string' && (VALID_ROLES as string[]).includes(body.role)
        ? (body.role as TeamRole)
        : 'editor';
    const member = await addTeamMember(user, email, role);
    return json({ member }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
