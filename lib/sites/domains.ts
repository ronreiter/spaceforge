import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';
import { getSiteAccess, roleAtLeast, ValidationError } from './service';

// Custom-domain mapping service. Owners/admins on a site can attach
// domains to it; the middleware reads this table to rewrite incoming
// requests to `/s/<slug>/<path>`. DNS + TLS are terminated outside the
// app — attaching the domain to Vercel (or wherever traffic lands) is
// a separate manual step. Here we only track the mapping.

export type SiteDomainRow = {
  domain: string;
  siteId: string;
  addedBy: string;
  createdAt: Date;
};

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

export async function listSiteDomains(
  user: AuthedUser,
  siteId: string,
): Promise<SiteDomainRow[]> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  const rows = await db
    .select()
    .from(schema.siteDomains)
    .where(eq(schema.siteDomains.siteId, siteId))
    .orderBy(desc(schema.siteDomains.createdAt));
  return rows;
}

export async function addSiteDomain(
  user: AuthedUser,
  siteId: string,
  rawDomain: string,
): Promise<SiteDomainRow> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError(
      'Only site admins/owners can manage custom domains.',
    );
  }
  const domain = normalizeDomain(rawDomain);
  if (!DOMAIN_RE.test(domain)) {
    throw new ValidationError(
      'Not a valid domain (e.g. "bakery.com" or "shop.example.org").',
    );
  }

  // Taken-by-another-site check — the domain PK already enforces
  // uniqueness, but we want a friendlier message than the Postgres
  // error.
  const [existing] = await db
    .select()
    .from(schema.siteDomains)
    .where(eq(schema.siteDomains.domain, domain))
    .limit(1);
  if (existing && existing.siteId !== siteId) {
    throw new ValidationError(
      `"${domain}" is already attached to another site.`,
    );
  }
  if (existing && existing.siteId === siteId) {
    return existing; // idempotent re-add
  }

  const [row] = await db
    .insert(schema.siteDomains)
    .values({
      domain,
      siteId,
      addedBy: user.id,
    })
    .returning();
  return row;
}

export async function removeSiteDomain(
  user: AuthedUser,
  siteId: string,
  rawDomain: string,
): Promise<void> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'admin')) {
    throw new ValidationError(
      'Only site admins/owners can manage custom domains.',
    );
  }
  const domain = normalizeDomain(rawDomain);
  await db
    .delete(schema.siteDomains)
    .where(
      and(
        eq(schema.siteDomains.domain, domain),
        eq(schema.siteDomains.siteId, siteId),
      ),
    );
}

// Host → slug lookup used by the middleware. Not AuthedUser-gated:
// public serving is public. Returns null for unknown hosts so the
// middleware can short-circuit.
export async function lookupSlugByDomain(domain: string): Promise<string | null> {
  const normalized = normalizeDomain(domain);
  const [row] = await db
    .select({ slug: schema.sites.slug, deletedAt: schema.sites.deletedAt })
    .from(schema.siteDomains)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.siteDomains.siteId))
    .where(eq(schema.siteDomains.domain, normalized))
    .limit(1);
  if (!row) return null;
  if (row.deletedAt) return null; // trashed sites don't serve
  return row.slug;
}
