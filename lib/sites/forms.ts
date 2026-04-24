import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';
import { getSiteAccess, ValidationError } from './service';
import { dispatchNotifications } from './formNotify';

// Server-side service for form submissions.
//
// Public submit path:
//   POST /api/forms/:slug/:name  (form-encoded or JSON)
// writes into this table. The editor surfaces submissions via the
// authed listSubmissions / countByFormName helpers.

export type SubmissionRow = {
  id: number;
  siteId: string;
  formName: string;
  data: Record<string, unknown>;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
};

export async function recordSubmission(input: {
  slug: string;
  formName: string;
  data: Record<string, unknown>;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<SubmissionRow | null> {
  // Resolve the slug to a live site. Soft-deleted sites silently
  // reject (returns null) — public endpoints shouldn't reveal whether
  // a slug ever existed.
  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.slug, input.slug))
    .limit(1);
  if (!site || site.deletedAt) return null;

  const name = input.formName.trim().slice(0, 120);
  if (!name) return null;

  const [row] = await db
    .insert(schema.formSubmissions)
    .values({
      siteId: site.id,
      formName: name,
      data: input.data as unknown as Record<string, unknown>,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    })
    .returning();

  // Fire notifications asynchronously — don't block the public
  // redirect on email/webhook delivery.
  void dispatchNotifications({
    siteId: site.id,
    siteName: site.name,
    siteSlug: site.slug,
    formName: name,
    data: input.data,
    submissionId: (row as SubmissionRow).id,
    createdAt: (row as SubmissionRow).createdAt,
  });

  return row as SubmissionRow;
}

export async function listSubmissions(
  user: AuthedUser,
  siteId: string,
  options: { formName?: string; limit?: number } = {},
): Promise<SubmissionRow[]> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);

  const rows = await db
    .select()
    .from(schema.formSubmissions)
    .where(
      options.formName
        ? and(
            eq(schema.formSubmissions.siteId, siteId),
            eq(schema.formSubmissions.formName, options.formName),
          )
        : eq(schema.formSubmissions.siteId, siteId),
    )
    .orderBy(desc(schema.formSubmissions.createdAt))
    .limit(limit);
  return rows as SubmissionRow[];
}

export async function countByFormName(
  user: AuthedUser,
  siteId: string,
): Promise<Array<{ formName: string; count: number; lastAt: Date }>> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');

  const rows = await db
    .select({
      formName: schema.formSubmissions.formName,
      count: sql<number>`count(*)::int`,
      lastAt: sql<Date>`max(${schema.formSubmissions.createdAt})`,
    })
    .from(schema.formSubmissions)
    .where(eq(schema.formSubmissions.siteId, siteId))
    .groupBy(schema.formSubmissions.formName)
    .orderBy(desc(sql`max(${schema.formSubmissions.createdAt})`));
  return rows;
}
