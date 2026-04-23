import { redirect } from 'next/navigation';
import { getCurrentUser, isDevAuth } from '../../../lib/auth';
import { listTrashForUser } from '../../../lib/sites/service';

export const dynamic = 'force-dynamic';
import { TrashView } from './TrashView';

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) {
    if (isDevAuth()) {
      throw new Error('Dev-auth returned no user — run `npm run db:seed:dev`.');
    }
    redirect('/sign-in');
  }
  const sites = await listTrashForUser(user);
  return <TrashView user={user} sites={sites} />;
}
