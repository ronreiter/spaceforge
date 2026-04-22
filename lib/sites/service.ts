import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';

// Server-side service layer for sites. Every function takes an
// AuthedUser so permissions are enforced at the boundary. Route handlers
// call requireUser() then hand the user to this module.

export type SiteSummary = {
  id: string;
  slug: string;
  name: string;
  templateId: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer'; // relative to the caller
  via: 'team' | 'collaborator';
};

// A user can see a site if they're in the owning team OR listed in
// site_collaborators. We union the two views.
export async function listSitesForUser(user: AuthedUser): Promise<SiteSummary[]> {
  // Sites owned by the user's active team (dev mode has only one team;
  // Clerk mode's auth.orgId chooses). Soft-deleted sites are filtered
  // out — they surface on /dashboard/trash instead.
  const teamSites = await db
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
    );

  // Sites shared with the user as an individual collaborator.
  const sharedSites = await db
    .select({ site: schema.sites, role: schema.siteCollaborators.role })
    .from(schema.sites)
    .innerJoin(
      schema.siteCollaborators,
      and(
        eq(schema.siteCollaborators.siteId, schema.sites.id),
        eq(schema.siteCollaborators.userId, user.id),
      ),
    )
    .where(isNull(schema.sites.deletedAt));

  const rows: SiteSummary[] = [];
  for (const r of teamSites) {
    rows.push({
      id: r.site.id,
      slug: r.site.slug,
      name: r.site.name,
      templateId: r.site.templateId,
      teamId: r.site.teamId,
      createdAt: r.site.createdAt,
      updatedAt: r.site.updatedAt,
      publishedAt: r.site.publishedAt,
      role: r.role as SiteSummary['role'],
      via: 'team',
    });
  }
  for (const r of sharedSites) {
    if (rows.some((existing) => existing.id === r.site.id)) continue;
    rows.push({
      id: r.site.id,
      slug: r.site.slug,
      name: r.site.name,
      templateId: r.site.templateId,
      teamId: r.site.teamId,
      createdAt: r.site.createdAt,
      updatedAt: r.site.updatedAt,
      publishedAt: r.site.publishedAt,
      role: (r.role === 'editor' ? 'editor' : 'viewer') as SiteSummary['role'],
      via: 'collaborator',
    });
  }
  rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return rows;
}

export type CreateSiteInput = {
  slug: string;
  name: string;
  templateId?: string;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function createSite(
  user: AuthedUser,
  input: CreateSiteInput,
): Promise<SiteSummary> {
  if (!SLUG_RE.test(input.slug)) {
    throw new ValidationError(
      'Slug must be 3–50 chars, lowercase letters, digits, and hyphens.',
    );
  }
  if (!input.name.trim()) {
    throw new ValidationError('Name is required.');
  }

  // Uniqueness pre-check for a friendlier error than the Postgres constraint.
  const existing = await db
    .select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.slug, input.slug))
    .limit(1);
  if (existing.length > 0) {
    throw new ValidationError(`Slug "${input.slug}" is taken.`);
  }

  const [row] = await db
    .insert(schema.sites)
    .values({
      teamId: user.teamId,
      slug: input.slug,
      name: input.name.trim(),
      templateId: input.templateId ?? 'custom',
      createdBy: user.id,
    })
    .returning();

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    templateId: row.templateId,
    teamId: row.teamId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    role: 'owner',
    via: 'team',
  };
}

// Access check: does the caller see this site, and in what role?
// Returns null when the user has no access — callers translate to 404/403.
// By default, soft-deleted sites are invisible (treated like 404); pass
// { includeDeleted: true } from the trash view to bypass the filter.
export async function getSiteAccess(
  user: AuthedUser,
  siteId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<{
  site: typeof schema.sites.$inferSelect;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  via: 'team' | 'collaborator';
} | null> {
  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId))
    .limit(1);
  if (!site) return null;
  if (!options.includeDeleted && site.deletedAt) return null;

  // Team membership (active team only — matches Clerk's one-org-at-a-time
  // session model).
  if (site.teamId === user.teamId) {
    const [membership] = await db
      .select({ role: schema.teamMembers.role })
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, site.teamId),
          eq(schema.teamMembers.userId, user.id),
        ),
      )
      .limit(1);
    if (membership) {
      return {
        site,
        role: membership.role as 'owner' | 'admin' | 'editor' | 'viewer',
        via: 'team',
      };
    }
  }

  // Per-site collaborator grant.
  const [collab] = await db
    .select({ role: schema.siteCollaborators.role })
    .from(schema.siteCollaborators)
    .where(
      and(
        eq(schema.siteCollaborators.siteId, site.id),
        eq(schema.siteCollaborators.userId, user.id),
      ),
    )
    .limit(1);
  if (collab) {
    return {
      site,
      role: (collab.role === 'editor' ? 'editor' : 'viewer') as
        | 'editor'
        | 'viewer',
      via: 'collaborator',
    };
  }

  return null;
}

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function roleAtLeast(
  role: string,
  min: 'viewer' | 'editor' | 'admin' | 'owner',
): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[min] ?? 0);
}

// Soft delete: stamps deleted_at so the site disappears from listings
// but the row and all its files/versions/collaborators stay intact for
// restore. Hard delete (hardDeleteSite) is a separate action invoked
// from /dashboard/trash.
export async function deleteSite(user: AuthedUser, siteId: string): Promise<void> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError('Only team admins/owners can delete a site.');
  }
  await db
    .update(schema.sites)
    .set({ deletedAt: sql`now()` })
    .where(eq(schema.sites.id, siteId));
}

// Trashed sites for the caller's active team. Collaborator-only grants
// aren't surfaced — only the owning team manages the trash.
export async function listTrashForUser(
  user: AuthedUser,
): Promise<SiteSummary[]> {
  const rows = await db
    .select({ site: schema.sites, role: schema.teamMembers.role })
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
        isNotNull(schema.sites.deletedAt),
      ),
    )
    .orderBy(desc(schema.sites.deletedAt));
  return rows.map((r) => ({
    id: r.site.id,
    slug: r.site.slug,
    name: r.site.name,
    templateId: r.site.templateId,
    teamId: r.site.teamId,
    createdAt: r.site.createdAt,
    updatedAt: r.site.updatedAt,
    publishedAt: r.site.publishedAt,
    role: r.role as SiteSummary['role'],
    via: 'team' as const,
  }));
}

export async function restoreSite(
  user: AuthedUser,
  siteId: string,
): Promise<void> {
  const access = await getSiteAccess(user, siteId, { includeDeleted: true });
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError('Only team admins/owners can restore a site.');
  }
  if (!access.site.deletedAt) return; // already restored
  await db
    .update(schema.sites)
    .set({ deletedAt: null })
    .where(eq(schema.sites.id, siteId));
}

// Hard delete — cascades to site_files / site_versions / site_collaborators
// via FK ON DELETE CASCADE. Blob artifacts are NOT wiped here; a
// background job can sweep orphan pub/<slug>/* later. The more urgent
// problem is freeing the slug.
export async function hardDeleteSite(
  user: AuthedUser,
  siteId: string,
): Promise<void> {
  const access = await getSiteAccess(user, siteId, { includeDeleted: true });
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError(
      'Only team admins/owners can permanently delete a site.',
    );
  }
  if (!access.site.deletedAt) {
    throw new ValidationError(
      'Move the site to trash first, then permanently delete.',
    );
  }
  await db.delete(schema.sites).where(eq(schema.sites.id, siteId));
}

// Partial update — template change, rename, etc. Editor access only
// (viewers shouldn't rename/swap templates). Only the fields provided
// are written.
export async function updateSite(
  user: AuthedUser,
  siteId: string,
  patch: { templateId?: string; name?: string },
): Promise<void> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'editor')) {
    throw new ValidationError('Read-only access — cannot modify site.');
  }
  const fields: Partial<typeof schema.sites.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof patch.templateId === 'string') fields.templateId = patch.templateId;
  if (typeof patch.name === 'string') {
    const name = patch.name.trim();
    if (!name) throw new ValidationError('Name cannot be empty.');
    fields.name = name;
  }
  await db.update(schema.sites).set(fields).where(eq(schema.sites.id, siteId));
}

// Touch updatedAt on the site row — called whenever drafts change so
// dashboard sort order reflects recent activity.
export async function touchSite(siteId: string): Promise<void> {
  await db
    .update(schema.sites)
    .set({ updatedAt: sql`now()` })
    .where(eq(schema.sites.id, siteId));
}

