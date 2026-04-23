import { redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../lib/auth';
import { listSitesForUser } from '../../lib/sites/service';

// Auth-gated + data-backed — must not be prerendered at build time
// (build can't connect to the user's DB / session).
export const dynamic = 'force-dynamic';
import { DashboardView } from './DashboardView';

// Server component: loads the current user and their sites, passes them
// to the client-side DashboardView. In dev-auth mode there's no redirect
// because every request is authenticated.

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    if (isDevAuth()) {
      throw new Error(
        'Dev-auth returned no user — did you run `npm run db:seed:dev`?',
      );
    }
    redirect('/sign-in');
  }
  const sites = await listSitesForUser(user);
  return <DashboardView user={user} sites={sites} />;
}
