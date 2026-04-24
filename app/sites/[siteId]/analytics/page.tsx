import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../../../lib/auth';
import { getSiteAccess } from '../../../../lib/sites/service';
import { getAnalyticsSummary } from '../../../../lib/sites/analytics';
import { AnalyticsView } from './AnalyticsView';

export const dynamic = 'force-dynamic';

// Client drives range selection by re-requesting via fetch; the initial
// SSR pass just renders the default 30-day window so the page lands
// instantly.
export default async function SiteAnalyticsPage({
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

  const summary = await getAnalyticsSummary(user, siteId, { range: '30d' });

  return (
    <AnalyticsView
      user={user}
      isDevAuth={isDevAuth()}
      site={{
        id: access.site.id,
        name: access.site.name,
        slug: access.site.slug,
      }}
      initialSummary={summary}
    />
  );
}
