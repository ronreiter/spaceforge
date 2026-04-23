import { redirect } from 'next/navigation';

// Root URL lands on the dashboard for signed-in users; Clerk middleware
// routes signed-out users to /sign-in automatically via the public-route
// list. Dev-auth always treats you as signed in, so this always forwards.
export default function Page() {
  redirect('/dashboard');
}
