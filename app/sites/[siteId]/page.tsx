import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../../lib/auth';
import { getSiteAccess } from '../../../lib/sites/service';
import { SiteEditor } from './SiteEditor';

// Server component: validates the user has access to this site, then
// hands the site details to the client-side editor. The editor itself
// still uses localStorage for file I/O in this slice — swapped to
// /api/sites/:id/files in a follow-up commit.

export default async function SitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    if (isDevAuth()) {
      throw new Error('Dev-auth returned no user — run `npm run db:seed:dev`.');
    }
    redirect('/sign-in');
  }
  const { siteId } = await params;
  const access = await getSiteAccess(user, siteId);
  if (!access) notFound();
  return (
    <SiteEditor
      siteId={access.site.id}
      siteName={access.site.name}
      siteSlug={access.site.slug}
      role={access.role}
      initialPublishedAt={
        access.site.publishedAt ? access.site.publishedAt.toISOString() : null
      }
      initialPublishedVersionId={access.site.publishedVersionId ?? null}
    />
  );
}
