import { redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../lib/auth';
import { listTeamMembers } from '../../lib/sharing/service';
import { TeamView } from './TeamView';

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) {
    if (isDevAuth()) {
      throw new Error('Dev-auth returned no user — run `npm run db:seed:dev`.');
    }
    redirect('/sign-in');
  }
  const members = await listTeamMembers(user);
  return <TeamView user={user} members={members} />;
}
