import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';
import { getSiteAccess, ValidationError } from './service';

// Lightweight page-view analytics. One row per hit on /s/:slug/... —
// the serving route fires recordView() without awaiting so the
// user-facing latency stays the same. Aggregations run on-demand from
// the authed analytics page.
//
// Bot filtering is minimal (obvious crawler UAs) to keep the MVP
// honest; anything fancier belongs in a follow-up.

const BOT_UA_RE =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|twitterbot|linkedinbot|pingdom|uptimerobot|monitor|headlesschrome|lighthouse|googlebot|ahrefsbot/i;

export function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return true; // no UA at all → treat as non-human
  return BOT_UA_RE.test(ua);
}

export async function recordView(input: {
  siteId: string;
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  host?: string | null;
}): Promise<void> {
  if (isBotUA(input.userAgent)) return;
  await db.insert(schema.pageViews).values({
    siteId: input.siteId,
    path: input.path,
    referrer: input.referrer ?? null,
    userAgent: input.userAgent ?? null,
    ip: input.ip ?? null,
    host: input.host ?? null,
  });
}

// Cheap fire-and-forget wrapper used from the hot serving path. Never
// throws — if the DB is unreachable, analytics is lost but the request
// still succeeds.
export function recordViewBestEffort(input: Parameters<typeof recordView>[0]): void {
  recordView(input).catch((err) => {
    console.error('[analytics] recordView failed', err);
  });
}

export type AnalyticsSummary = {
  totalLast24h: number;
  totalLast7d: number;
  totalLast30d: number;
  topPaths: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  dailySeries: Array<{ day: string; count: number }>;
  recent: Array<{
    id: number;
    path: string;
    referrer: string | null;
    userAgent: string | null;
    host: string | null;
    createdAt: string;
  }>;
};

export async function getAnalyticsSummary(
  user: AuthedUser,
  siteId: string,
): Promise<AnalyticsSummary> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');

  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * 3600 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [totals] = await db
    .select({
      h24: sql<number>`count(*) filter (where ${schema.pageViews.createdAt} >= ${h24})::int`,
      d7: sql<number>`count(*) filter (where ${schema.pageViews.createdAt} >= ${d7})::int`,
      d30: sql<number>`count(*) filter (where ${schema.pageViews.createdAt} >= ${d30})::int`,
    })
    .from(schema.pageViews)
    .where(eq(schema.pageViews.siteId, siteId));

  const topPaths = await db
    .select({
      path: schema.pageViews.path,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.pageViews)
    .where(
      and(eq(schema.pageViews.siteId, siteId), gte(schema.pageViews.createdAt, d30)),
    )
    .groupBy(schema.pageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topReferrers = await db
    .select({
      referrer: sql<string>`coalesce(${schema.pageViews.referrer}, '(direct)')`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.pageViews)
    .where(
      and(eq(schema.pageViews.siteId, siteId), gte(schema.pageViews.createdAt, d30)),
    )
    .groupBy(sql`coalesce(${schema.pageViews.referrer}, '(direct)')`)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${schema.pageViews.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.pageViews)
    .where(
      and(eq(schema.pageViews.siteId, siteId), gte(schema.pageViews.createdAt, d30)),
    )
    .groupBy(sql`date_trunc('day', ${schema.pageViews.createdAt})`)
    .orderBy(sql`date_trunc('day', ${schema.pageViews.createdAt}) asc`);

  const recent = await db
    .select()
    .from(schema.pageViews)
    .where(eq(schema.pageViews.siteId, siteId))
    .orderBy(desc(schema.pageViews.createdAt))
    .limit(50);

  return {
    totalLast24h: totals?.h24 ?? 0,
    totalLast7d: totals?.d7 ?? 0,
    totalLast30d: totals?.d30 ?? 0,
    topPaths,
    topReferrers,
    dailySeries: dailyRows,
    recent: recent.map((r) => ({
      id: r.id,
      path: r.path,
      referrer: r.referrer,
      userAgent: r.userAgent,
      host: r.host,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
