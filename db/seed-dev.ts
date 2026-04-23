import { db, schema } from './client';
import {
  DEV_TEAM_ID,
  DEV_TEAM_NAME,
  DEV_TEAM_SLUG,
  DEV_USER_EMAIL,
  DEV_USER_ID,
  DEV_USER_NAME,
} from '../lib/auth/dev';

// Idempotent seed for AUTH_DRIVER=dev: inserts the fake dev user + team
// so FK-constrained rows (sites.createdBy, teams.id) have something to
// point at. Safe to run repeatedly.
//
// Run via `npm run db:seed:dev`.

async function main() {
  console.log('Seeding dev user + team…');
  await db
    .insert(schema.users)
    .values({
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: DEV_USER_NAME,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.teams)
    .values({
      id: DEV_TEAM_ID,
      slug: DEV_TEAM_SLUG,
      name: DEV_TEAM_NAME,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.teamMembers)
    .values({
      teamId: DEV_TEAM_ID,
      userId: DEV_USER_ID,
      role: 'owner',
    })
    .onConflictDoNothing();

  console.log(`Dev identity ready: user=${DEV_USER_ID} team=${DEV_TEAM_ID}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
