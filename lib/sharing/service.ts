import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';
import { isDevAuth } from '../auth';
import { getSiteAccess, roleAtLeast, ValidationError } from '../sites/service';

// Sharing: who can do what on a site.
//
//   Team members   — everyone in the owning team gets access per their
//                    team role (owner > admin > editor > viewer).
//   Collaborators  — ad-hoc per-site grants (editor | viewer) for users
//                    who AREN'T in the team. A site can be shared to any
//                    user without moving them into the team.
//
// Dev-auth mode: we synthesize user rows from email so the flow is
// fully exercisable without a Clerk instance. Clerk-auth mode: we look
// the user up by email via Clerk's API and use their real user id.
// Never actually *invites* anyone in either mode yet — add-existing
// only. Full Clerk invite flow lands when we have a Clerk dev instance.

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type CollabRole = 'editor' | 'viewer';

export type TeamMemberRow = {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: Date;
};

export type CollaboratorRow = {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: CollabRole;
  addedAt: Date;
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function devUserIdForEmail(email: string): string {
  // Stable fake id derived from the normalized email. Lets dev-mode
  // "invites" land on the same row for the same address across reruns.
  const h = crypto
    .createHash('sha1')
    .update(normalizeEmail(email))
    .digest('hex')
    .slice(0, 12);
  return `user_dev_${h}`;
}

function devNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Locate (or synthesize in dev mode) a user row by email. Returns null
// if the address is invalid or — in clerk mode — not found.
export async function resolveUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null } | null> {
  const normalized = normalizeEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new ValidationError('Invalid email address.');
  }

  // Always check local mirror first — covers both drivers.
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalized))
    .limit(1);
  if (existing) {
    return { id: existing.id, email: existing.email, name: existing.name };
  }

  if (isDevAuth()) {
    // Synthesize. Idempotent via ON CONFLICT DO NOTHING + re-select.
    const id = devUserIdForEmail(normalized);
    const name = devNameFromEmail(normalized);
    await db
      .insert(schema.users)
      .values({ id, email: normalized, name })
      .onConflictDoNothing();
    return { id, email: normalized, name };
  }

  // Clerk mode: try to locate by email via Clerk's backend API.
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const list = await client.users.getUserList({ emailAddress: [normalized], limit: 1 });
    const u = list.data[0];
    if (!u) return null;
    // Mirror into the local users table so downstream joins work.
    const name = u.fullName ?? u.firstName ?? null;
    await db
      .insert(schema.users)
      .values({
        id: u.id,
        email: normalized,
        name,
        avatarUrl: u.imageUrl ?? null,
      })
      .onConflictDoNothing();
    return { id: u.id, email: normalized, name };
  } catch (err) {
    console.error('[sharing] Clerk user lookup failed', err);
    return null;
  }
}

// -------------------- team members -------------------------------

export async function listTeamMembers(
  user: AuthedUser,
): Promise<TeamMemberRow[]> {
  // Must be a member of the team to see the roster.
  const [self] = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, user.id),
      ),
    )
    .limit(1);
  if (!self) throw new ValidationError('Not a member of this team.');

  const rows = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      role: schema.teamMembers.role,
      joinedAt: schema.teamMembers.joinedAt,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId))
    .where(eq(schema.teamMembers.teamId, user.teamId))
    .orderBy(desc(schema.teamMembers.joinedAt));
  return rows as TeamMemberRow[];
}

export async function addTeamMember(
  user: AuthedUser,
  email: string,
  role: TeamRole,
): Promise<TeamMemberRow> {
  await requireTeamAdmin(user);
  if (role === 'owner') {
    throw new ValidationError('Owner role cannot be assigned directly.');
  }
  const resolved = await resolveUserByEmail(email);
  if (!resolved) {
    throw new ValidationError(
      `No Spaceforge user found for ${email}. Ask them to sign up first.`,
    );
  }

  await db
    .insert(schema.teamMembers)
    .values({
      teamId: user.teamId,
      userId: resolved.id,
      role,
    })
    .onConflictDoUpdate({
      target: [schema.teamMembers.teamId, schema.teamMembers.userId],
      set: { role },
    });

  // Return the fresh row shape.
  const [row] = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      role: schema.teamMembers.role,
      joinedAt: schema.teamMembers.joinedAt,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId))
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, resolved.id),
      ),
    )
    .limit(1);
  return row as TeamMemberRow;
}

export async function changeTeamMemberRole(
  user: AuthedUser,
  targetUserId: string,
  role: TeamRole,
): Promise<void> {
  await requireTeamAdmin(user);
  if (role === 'owner') {
    throw new ValidationError('Owner role cannot be assigned directly.');
  }
  // Don't let someone demote the last owner.
  const [target] = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, targetUserId),
      ),
    )
    .limit(1);
  if (!target) throw new ValidationError('Member not found.');
  if (target.role === 'owner') {
    const owners = await db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, user.teamId),
          eq(schema.teamMembers.role, 'owner'),
        ),
      );
    if (owners.length <= 1) {
      throw new ValidationError('Cannot demote the last owner.');
    }
  }
  await db
    .update(schema.teamMembers)
    .set({ role })
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, targetUserId),
      ),
    );
}

export async function removeTeamMember(
  user: AuthedUser,
  targetUserId: string,
): Promise<void> {
  await requireTeamAdmin(user);
  if (targetUserId === user.id) {
    throw new ValidationError('Use "leave team" from your own settings instead.');
  }
  // Don't let a non-owner remove an owner, or the last owner.
  const [target] = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, targetUserId),
      ),
    )
    .limit(1);
  if (!target) return;
  if (target.role === 'owner') {
    throw new ValidationError('Demote this owner first, or transfer ownership.');
  }
  await db
    .delete(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, targetUserId),
      ),
    );
}

async function requireTeamAdmin(user: AuthedUser): Promise<void> {
  const [self] = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, user.id),
      ),
    )
    .limit(1);
  if (!self || !roleAtLeast(self.role, 'admin')) {
    throw new ValidationError('Only team admins/owners can manage members.');
  }
}

// -------------------- site collaborators --------------------------

export async function listSiteCollaborators(
  user: AuthedUser,
  siteId: string,
): Promise<CollaboratorRow[]> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');

  const rows = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      role: schema.siteCollaborators.role,
      addedAt: schema.siteCollaborators.addedAt,
    })
    .from(schema.siteCollaborators)
    .innerJoin(schema.users, eq(schema.users.id, schema.siteCollaborators.userId))
    .where(eq(schema.siteCollaborators.siteId, siteId))
    .orderBy(desc(schema.siteCollaborators.addedAt));
  return rows as CollaboratorRow[];
}

export async function addSiteCollaborator(
  user: AuthedUser,
  siteId: string,
  email: string,
  role: CollabRole,
): Promise<CollaboratorRow> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError(
      'Only site admins/owners can manage collaborators.',
    );
  }
  const resolved = await resolveUserByEmail(email);
  if (!resolved) {
    throw new ValidationError(
      `No Spaceforge user found for ${email}. Ask them to sign up first.`,
    );
  }
  if (resolved.id === user.id) {
    throw new ValidationError('You already have access to this site.');
  }
  await db
    .insert(schema.siteCollaborators)
    .values({
      siteId,
      userId: resolved.id,
      role,
    })
    .onConflictDoUpdate({
      target: [schema.siteCollaborators.siteId, schema.siteCollaborators.userId],
      set: { role },
    });

  const [row] = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      role: schema.siteCollaborators.role,
      addedAt: schema.siteCollaborators.addedAt,
    })
    .from(schema.siteCollaborators)
    .innerJoin(schema.users, eq(schema.users.id, schema.siteCollaborators.userId))
    .where(
      and(
        eq(schema.siteCollaborators.siteId, siteId),
        eq(schema.siteCollaborators.userId, resolved.id),
      ),
    )
    .limit(1);
  return row as CollaboratorRow;
}

export async function removeSiteCollaborator(
  user: AuthedUser,
  siteId: string,
  targetUserId: string,
): Promise<void> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError(
      'Only site admins/owners can manage collaborators.',
    );
  }
  await db
    .delete(schema.siteCollaborators)
    .where(
      and(
        eq(schema.siteCollaborators.siteId, siteId),
        eq(schema.siteCollaborators.userId, targetUserId),
      ),
    );
}
