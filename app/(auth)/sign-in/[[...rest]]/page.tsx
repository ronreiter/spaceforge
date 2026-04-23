import { redirect } from 'next/navigation';
import { isDevAuth } from '../../../../lib/auth';

// In Clerk mode we render Clerk's <SignIn /> component. In dev-auth mode
// we short-circuit to /dashboard — there's no real sign-in.

export default async function SignInPage() {
  if (isDevAuth()) redirect('/dashboard');
  const { SignIn } = await import('@clerk/nextjs');
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <SignIn />
    </div>
  );
}
