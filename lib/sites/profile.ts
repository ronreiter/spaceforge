import { and, desc, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';

// Aggregate view used by /profile. Cheap single-trip queries —
// everything is bounded to the caller's team (or collaborator
// grants) so we don't leak counts across tenants.

export type ProfileStats = {
  ownedSites: number;
  publishedSites: number;
  trashedSites: number;
  sharedWithMe: number;
  teamMembers: number;
  submissionsLast7d: number;
  viewsLast7d: number;
  team: {
    id: string;
    name: string | null;
    slug: string | null;
    plan: string | null;
    role: string | null;
  };
  recentSites: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    publishedAt: string | null;
    updatedAt: string;
  }>;
};

export async function getProfileStats(user: AuthedUser): Promise<ProfileStats> {
  const [teamRow] = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.id, user.teamId))
    .limit(1);
  const [membershipRow] = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, user.teamId),
        eq(schema.teamMembers.userId, user.id),
      ),
    )
    .limit(1);

  const [siteCounts] = await db
    .select({
      owned: sql<number>`count(*) filter (where ${schema.sites.deletedAt} is null)::int`,
      trashed: sql<number>`count(*) filter (where ${schema.sites.deletedAt} is not null)::int`,
      published: sql<number>`count(*) filter (where ${schema.sites.publishedVersionId} is not null and ${schema.sites.deletedAt} is null)::int`,
    })
    .from(schema.sites)
    .where(eq(schema.sites.teamId, user.teamId));

  const [sharedWithMe] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.siteCollaborators)
    .innerJoin(
      schema.sites,
      eq(schema.sites.id, schema.siteCollaborators.siteId),
    )
    .where(
      and(
        eq(schema.siteCollaborators.userId, user.id),
        isNull(schema.sites.deletedAt),
      ),
    );

  const [teamMemberCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.teamId, user.teamId));

  const d7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [subCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.formSubmissions)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.formSubmissions.siteId))
    .where(
      and(
        eq(schema.sites.teamId, user.teamId),
        gte(schema.formSubmissions.createdAt, d7),
      ),
    );

  const [viewCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.pageViews)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.pageViews.siteId))
    .where(
      and(
        eq(schema.sites.teamId, user.teamId),
        gte(schema.pageViews.createdAt, d7),
      ),
    );

  const recent = await db
    .select({
      site: schema.sites,
      role: schema.teamMembers.role,
    })
    .from(schema.sites)
    .innerJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.sites.teamId),
        eq(schema.teamMembers.userId, user.id),
      ),
    )
    .where(
      and(
        eq(schema.sites.teamId, user.teamId),
        isNull(schema.sites.deletedAt),
      ),
    )
    .orderBy(desc(schema.sites.updatedAt))
    .limit(5);

  return {
    ownedSites: siteCounts?.owned ?? 0,
    publishedSites: siteCounts?.published ?? 0,
    trashedSites: siteCounts?.trashed ?? 0,
    sharedWithMe: sharedWithMe?.n ?? 0,
    teamMembers: teamMemberCount?.n ?? 0,
    submissionsLast7d: subCount?.n ?? 0,
    viewsLast7d: viewCount?.n ?? 0,
    team: {
      id: user.teamId,
      name: teamRow?.name ?? null,
      slug: teamRow?.slug ?? null,
      plan: teamRow?.plan ?? null,
      role: membershipRow?.role ?? null,
    },
    recentSites: recent.map((r) => ({
      id: r.site.id,
      name: r.site.name,
      slug: r.site.slug,
      role: r.role,
      publishedAt: r.site.publishedAt ? r.site.publishedAt.toISOString() : null,
      updatedAt: r.site.updatedAt.toISOString(),
    })),
  };
}

// Light-weight "nothing in this table yet" guard — avoids leaking the
// "you're a brand-new user" nuance to the count functions above.
export async function hasAnyActivity(user: AuthedUser): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.sites)
    .where(
      and(
        eq(schema.sites.teamId, user.teamId),
        // Any site (live OR trashed) counts as activity.
        sql`true`,
      ),
    );
  return (row?.n ?? 0) > 0;
}
