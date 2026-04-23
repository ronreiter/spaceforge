import { redirect } from 'next/navigation';
import { isDevAuth } from '../../../../lib/auth';

export default async function SignUpPage() {
  if (isDevAuth()) redirect('/dashboard');
  const { SignUp } = await import('@clerk/nextjs');
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <SignUp />
    </div>
  );
}
