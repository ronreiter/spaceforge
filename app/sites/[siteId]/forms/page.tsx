import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../../../lib/auth';
import { getSiteAccess } from '../../../../lib/sites/service';
import {
  countByFormName,
  listSubmissions,
} from '../../../../lib/sites/forms';
import { FormSubmissionsView } from './FormSubmissionsView';

export const dynamic = 'force-dynamic';

export default async function SiteFormsPage({
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

  const [submissions, counts] = await Promise.all([
    listSubmissions(user, siteId, { limit: 200 }),
    countByFormName(user, siteId),
  ]);

  return (
    <FormSubmissionsView
      user={user}
      isDevAuth={isDevAuth()}
      site={{
        id: access.site.id,
        name: access.site.name,
        slug: access.site.slug,
      }}
      initialSubmissions={submissions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }))}
      initialCounts={counts.map((c) => ({
        formName: c.formName,
        count: c.count,
        // Drizzle's raw-sql `max()` returns the string from Postgres as-is
        // (no Date coercion). Accept either shape so the page renders.
        lastAt:
          c.lastAt instanceof Date
            ? c.lastAt.toISOString()
            : String(c.lastAt),
      }))}
    />
  );
}
