import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import { getSiteAccess, roleAtLeast } from '../sites/service';
import type { AuthedUser } from '../auth/types';
import { PublishError } from './pipeline';

// Version history + rollback. The publish pipeline already writes
// immutable artifacts keyed by version id, so "rollback" is just an
// atomic UPDATE of sites.published_version_id — no re-render, no new
// blob writes.

export type VersionSummary = {
  id: string;
  publishedAt: string;
  authorId: string;
  artifactCount: number;
  totalBytes: number;
  isCurrent: boolean;
};

export async function listVersions(
  user: AuthedUser,
  siteId: string,
): Promise<VersionSummary[]> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new PublishError('Site not found.');

  const rows = await db
    .select()
    .from(schema.siteVersions)
    .where(eq(schema.siteVersions.siteId, siteId))
    .orderBy(desc(schema.siteVersions.publishedAt));

  return rows.map((r) => {
    const manifest = Array.isArray(r.manifest)
      ? (r.manifest as Array<{ size: number }>)
      : [];
    const totalBytes = manifest.reduce((sum, a) => sum + (a.size ?? 0), 0);
    return {
      id: r.id,
      publishedAt: r.publishedAt.toISOString(),
      authorId: r.authorId,
      artifactCount: manifest.length,
      totalBytes,
      isCurrent: r.id === access.site.publishedVersionId,
    };
  });
}

export async function activateVersion(
  user: AuthedUser,
  siteId: string,
  versionId: string,
): Promise<{ publishedAt: string }> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new PublishError('Site not found.');
  if (!roleAtLeast(access.role, 'editor')) {
    throw new PublishError('Read-only access — cannot change published version.');
  }

  const [version] = await db
    .select()
    .from(schema.siteVersions)
    .where(eq(schema.siteVersions.id, versionId))
    .limit(1);
  if (!version || version.siteId !== siteId) {
    throw new PublishError('Version not found for this site.');
  }

  const publishedAt = new Date();
  await db
    .update(schema.sites)
    .set({ publishedVersionId: versionId, publishedAt })
    .where(eq(schema.sites.id, siteId));
  return { publishedAt: publishedAt.toISOString() };
}
