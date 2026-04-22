// What every route/server-action sees after identifying the caller.
//
// `teamId` is the active team (Clerk org) for this request. The dev
// driver always returns a fixed team; Clerk's org switcher controls it in
// prod. A request with no active org gets `teamId = personalTeamId(userId)`
// so personal sites always belong somewhere.

export type AuthedUser = {
  id: string;                 // e.g. "user_abc123" or "user_dev_local"
  email: string;
  name: string | null;
  avatarUrl: string | null;
  teamId: string;             // active team id
};

export function personalTeamId(userId: string): string {
  // Mirrors Clerk's convention of prefixing personal workspaces. Drop in a
  // real personal-org id once Clerk webhooks create them.
  return `org_personal_${userId}`;
}
