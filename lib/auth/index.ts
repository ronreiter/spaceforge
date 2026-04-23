import type { AuthedUser } from './types';
import { personalTeamId, type AuthedUser as AuthedUserType } from './types';
import { getDevUser } from './dev';

// Unified auth interface used by every server-side caller. Internally
// routes to Clerk in prod / preview, or to the dev stub locally when
// AUTH_DRIVER=dev.
//
// Keep this the ONLY place that reads Clerk's auth() — routes call
// getCurrentUser() / requireUser() without knowing about the driver.

export function isDevAuth(): boolean {
  return (process.env.AUTH_DRIVER ?? '').toLowerCase() === 'dev';
}

export async function getCurrentUser(): Promise<AuthedUser | null> {
  if (isDevAuth()) return getDevUser();

  // Dynamic import so @clerk/nextjs doesn't get pulled into the bundle
  // when AUTH_DRIVER=dev.
  const { auth, currentUser } = await import('@clerk/nextjs/server');
  const { userId, orgId } = await auth();
  if (!userId) return null;
  const u = await currentUser();
  return {
    id: userId,
    email: u?.primaryEmailAddress?.emailAddress ?? '',
    name:
      u?.fullName ??
      u?.firstName ??
      u?.primaryEmailAddress?.emailAddress ??
      null,
    avatarUrl: u?.imageUrl ?? null,
    teamId: orgId ?? personalTeamId(userId),
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError('Not signed in');
  return u;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export type { AuthedUserType as AuthedUser };
