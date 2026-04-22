import { describe, it, expect } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

// Smoke-test: the Drizzle schema actually lines up with the migrated
// database. Only runs when DATABASE_URL is set — skipped in CI and on
// machines without a local Postgres so the normal `npm run test` stays
// green without Docker.
//
// Run locally with:
//   docker compose up -d
//   npm run db:migrate
//   DATABASE_URL=postgres://spaceforge:spaceforge@localhost:5432/spaceforge \
//     npm run test -- tests/db.smoke.test.ts

const URL = process.env.DATABASE_URL;

describe.skipIf(!URL)('db smoke (requires DATABASE_URL)', () => {
  it('round-trips a user + team + site', async () => {
    const pool = new Pool({ connectionString: URL!, max: 2 });
    const db = drizzle({ client: pool, schema });

    const userId = `user_smoke_${Date.now()}`;
    const teamId = `org_smoke_${Date.now()}`;
    const teamSlug = `smoke-${Date.now()}`;

    try {
      await db.insert(schema.users).values({
        id: userId,
        email: `${userId}@example.com`,
        name: 'Smoke',
      });
      await db.insert(schema.teams).values({
        id: teamId,
        slug: teamSlug,
        name: 'Smoke Team',
      });
      await db.insert(schema.teamMembers).values({
        teamId,
        userId,
        role: 'owner',
      });
      const [site] = await db
        .insert(schema.sites)
        .values({
          teamId,
          slug: `smoke-site-${Date.now()}`,
          name: 'Smoke Site',
          createdBy: userId,
        })
        .returning();
      expect(site.id).toMatch(/^[0-9a-f-]{36}$/);

      const rows = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.id, site.id));
      expect(rows[0].name).toBe('Smoke Site');
      expect(rows[0].templateId).toBe('custom');
    } finally {
      // Cascades clean up team_members, sites via FK ON DELETE CASCADE.
      await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
      await pool.end();
    }
  });
});
