import crypto from 'node:crypto';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
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

function hashVisitor(ip: string | null | undefined, ua: string | null | undefined): string {
  // Day-scoped visitor hash: same ip+ua on different days count as
  // separate uniques, which matches most analytics tools. Truncated
  // to 16 hex chars — more than enough entropy and easier on pg index size.
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash('sha256')
    .update(`${ip ?? ''}|${ua ?? ''}|${day}`)
    .digest('hex')
    .slice(0, 16);
}

export async function recordView(input: {
  siteId: string;
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  host?: string | null;
  country?: string | null;
}): Promise<void> {
  if (isBotUA(input.userAgent)) return;
  await db.insert(schema.pageViews).values({
    siteId: input.siteId,
    path: input.path,
    referrer: input.referrer ?? null,
    userAgent: input.userAgent ?? null,
    ip: input.ip ?? null,
    host: input.host ?? null,
    country: input.country ?? null,
    visitorHash: hashVisitor(input.ip, input.userAgent),
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
  from: string; // ISO
  to: string;   // ISO
  totalViews: number;
  uniqueVisitors: number;
  // Mini trend: last 24h vs 30d for the stat cards, independent of the
  // main range selection.
  stat: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  topPaths: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  dailySeries: Array<{ day: string; count: number; uniques: number }>;
  recent: Array<{
    id: number;
    path: string;
    referrer: string | null;
    userAgent: string | null;
    host: string | null;
    country: string | null;
    createdAt: string;
  }>;
};

// Supported presets. `custom` requires caller-provided from/to.
export type AnalyticsRange = '24h' | '7d' | '30d' | '90d' | 'custom';

function resolveRange(
  range: AnalyticsRange,
  from?: Date,
  to?: Date,
): { from: Date; to: Date } {
  const now = to ?? new Date();
  if (range === 'custom' && from && to) return { from, to };
  const ms =
    range === '24h' ? 24 * 3600 * 1000 :
    range === '7d' ? 7 * 24 * 3600 * 1000 :
    range === '90d' ? 90 * 24 * 3600 * 1000 :
    30 * 24 * 3600 * 1000;
  return { from: new Date(now.getTime() - ms), to: now };
}

export async function getAnalyticsSummary(
  user: AuthedUser,
  siteId: string,
  rangeInput: { range?: AnalyticsRange; from?: Date; to?: Date } = {},
): Promise<AnalyticsSummary> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');

  const { from, to } = resolveRange(
    rangeInput.range ?? '30d',
    rangeInput.from,
    rangeInput.to,
  );

  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * 3600 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [stat] = await db
    .select({
      h24: sql<number>`count(*) filter (where ${schema.pageViews.createdAt} >= ${h24})::int`,
      d7: sql<number>`count(*) filter (where ${schema.pageViews.createdAt} >= ${d7})::int`,
      d30: sql<number>`count(*) filter (where ${schema.pageViews.createdAt} >= ${d30})::int`,
    })
    .from(schema.pageViews)
    .where(eq(schema.pageViews.siteId, siteId));

  const inRange = and(
    eq(schema.pageViews.siteId, siteId),
    gte(schema.pageViews.createdAt, from),
    lte(schema.pageViews.createdAt, to),
  );

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      uniques: sql<number>`count(distinct ${schema.pageViews.visitorHash})::int`,
    })
    .from(schema.pageViews)
    .where(inRange);

  const topPaths = await db
    .select({
      path: schema.pageViews.path,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.pageViews)
    .where(inRange)
    .groupBy(schema.pageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topReferrers = await db
    .select({
      referrer: sql<string>`coalesce(${schema.pageViews.referrer}, '(direct)')`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.pageViews)
    .where(inRange)
    .groupBy(sql`coalesce(${schema.pageViews.referrer}, '(direct)')`)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topCountries = await db
    .select({
      country: sql<string>`coalesce(${schema.pageViews.country}, '(unknown)')`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.pageViews)
    .where(inRange)
    .groupBy(sql`coalesce(${schema.pageViews.country}, '(unknown)')`)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${schema.pageViews.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
      uniques: sql<number>`count(distinct ${schema.pageViews.visitorHash})::int`,
    })
    .from(schema.pageViews)
    .where(inRange)
    .groupBy(sql`date_trunc('day', ${schema.pageViews.createdAt})`)
    .orderBy(sql`date_trunc('day', ${schema.pageViews.createdAt}) asc`);

  const recent = await db
    .select()
    .from(schema.pageViews)
    .where(eq(schema.pageViews.siteId, siteId))
    .orderBy(desc(schema.pageViews.createdAt))
    .limit(50);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totalViews: totals?.total ?? 0,
    uniqueVisitors: totals?.uniques ?? 0,
    stat: {
      last24h: stat?.h24 ?? 0,
      last7d: stat?.d7 ?? 0,
      last30d: stat?.d30 ?? 0,
    },
    topPaths,
    topReferrers,
    topCountries,
    dailySeries: dailyRows,
    recent: recent.map((r) => ({
      id: r.id,
      path: r.path,
      referrer: r.referrer,
      userAgent: r.userAgent,
      host: r.host,
      country: r.country,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
