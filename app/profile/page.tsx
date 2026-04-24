import { redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../lib/auth';
import { getProfileStats } from '../../lib/sites/profile';
import { ProfileView } from './ProfileView';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    if (isDevAuth()) {
      throw new Error('Dev-auth returned no user — run `npm run db:seed:dev`.');
    }
    redirect('/sign-in');
  }
  const stats = await getProfileStats(user);
  return (
    <ProfileView
      user={user}
      isDevAuth={isDevAuth()}
      stats={stats}
    />
  );
}
