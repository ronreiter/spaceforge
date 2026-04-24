import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  bigserial,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// Spaceforge data model. Clerk is the source of truth for users/orgs;
// `users` and `teams` tables are local mirrors so FKs, joins, and audit
// queries stay fast without an extra network call. Clerk webhooks keep
// them in sync (see app/api/webhooks/clerk).

export const users = pgTable('users', {
  id: text('id').primaryKey(),        // = Clerk user id (user_XXX)
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),         // = Clerk organization id (org_XXX)
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // owner | admin | editor | viewer
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.userId] }),
    index('team_members_user_idx').on(t.userId),
  ],
);

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    templateId: text('template_id').notNull().default('custom'),
    // Tabler icon name without the "ti-" prefix (e.g. "rocket", "bread").
    // Null → the route-level fallback favicon is served.
    faviconIcon: text('favicon_icon'),
    // publishedVersionId is a FK to site_versions, but defined as plain uuid
    // here to avoid the circular FK (site_versions.siteId → sites.id). Set
    // via plain UPDATE after inserting a version row.
    publishedVersionId: uuid('published_version_id'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Soft delete: non-null → site is in trash. Kept indefinitely until
    // the user Permanently Deletes (hard delete cascades to files/
    // versions/collaborators). Listing queries filter WHERE
    // deleted_at IS NULL so soft-deleted sites disappear from
    // dashboard / editor / public /s without extra plumbing.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('sites_team_idx').on(t.teamId)],
);

// Per-site grants outside the owning team — invited individuals.
export const siteCollaborators = pgTable(
  'site_collaborators',
  {
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // editor | viewer
    role: text('role').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.siteId, t.userId] }),
    index('site_collab_user_idx').on(t.userId),
  ],
);

// Manifest of the current draft. The blob IS the content; this row is the
// file-tree entry + metadata.
export const siteFiles = pgTable(
  'site_files',
  {
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    blobKey: text('blob_key').notNull(),
    size: integer('size').notNull(),
    contentHash: text('content_hash').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.path] })],
);

// Immutable snapshots taken on Publish. Old versions are kept (default 5)
// so rollback is instant; older ones are garbage-collected by a cleanup job.
export const siteVersions = pgTable(
  'site_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id),
    // [{ path, blobKey, outputPath, size, contentHash, contentType }]
    manifest: jsonb('manifest').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('site_versions_site_idx').on(t.siteId)],
);

// Chat log per site. Replaces the in-memory history.
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => users.id),
    // 'user' | 'assistant' | 'system'
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chat_messages_site_idx').on(t.siteId, t.id)],
);

// Per-form notification rules. One row per (site, formName) pair;
// formName='' applies to every form on the site. On a new
// submission the handler queries this table and fires an email (if
// an email address + RESEND_API_KEY are configured) and a webhook
// POST (if a webhook URL is configured). Both are best-effort.
export const formNotifications = pgTable(
  'form_notifications',
  {
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    formName: text('form_name').notNull().default(''),
    email: text('email'),
    webhookUrl: text('webhook_url'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.formName] })],
);

// Page views against the public /s/:slug/... serving route. One row per
// hit. The serving route records them fire-and-forget so latency stays
// flat; the authed analytics page rolls them up into totals + top
// pages / referrers.
export const pageViews = pgTable(
  'page_views',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    ip: text('ip'),
    host: text('host'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('page_views_site_idx').on(t.siteId, t.createdAt)],
);

// Form submissions captured from a published site. The public
// POST /api/forms/:slug/:name handler writes into this table; the
// editor surfaces the submissions under /sites/:id/forms. Data is
// stored verbatim as jsonb so a form can have any field set.
export const formSubmissions = pgTable(
  'form_submissions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    formName: text('form_name').notNull(),
    data: jsonb('data').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('form_submissions_site_idx').on(t.siteId, t.createdAt)],
);

// Custom domains pointed at a site. One domain maps to one site; the
// middleware reads this table to translate `bakery.com` → /s/<slug>.
// Attaching the domain on Vercel (or wherever it terminates) is a
// separate manual step — this table only records the mapping.
export const siteDomains = pgTable(
  'site_domains',
  {
    domain: text('domain').primaryKey(), // normalized lowercase, e.g. "bakery.com"
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    addedBy: text('added_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('site_domains_site_idx').on(t.siteId)],
);

// Table type helpers for convenient inference.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type SiteFile = typeof siteFiles.$inferSelect;
export type SiteVersion = typeof siteVersions.$inferSelect;
