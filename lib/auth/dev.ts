import type { AuthedUser } from './types';
import { personalTeamId } from './types';

// Dev-only auth driver: always returns the same fake user. Enabled by
// AUTH_DRIVER=dev. The matching seed script (db/seed-dev.ts) creates the
// corresponding user + team rows so every API call finds the expected FKs.
//
// Never ship this to production — the request is always "authenticated"
// as the same hardcoded identity. Middleware should reject non-dev envs.

export const DEV_USER_ID = 'user_dev_local';
export const DEV_USER_EMAIL = 'dev@spaceforge.local';
export const DEV_USER_NAME = 'Local Dev';
export const DEV_TEAM_ID = personalTeamId(DEV_USER_ID);
export const DEV_TEAM_SLUG = 'dev-local';
export const DEV_TEAM_NAME = 'Local Dev Team';

export function getDevUser(): AuthedUser {
  return {
    id: DEV_USER_ID,
    email: DEV_USER_EMAIL,
    name: DEV_USER_NAME,
    avatarUrl: null,
    teamId: DEV_TEAM_ID,
  };
}
