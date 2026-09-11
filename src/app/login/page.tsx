import type { Metadata } from 'next';

import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { LoginForm } from '@/features/auth/components/login-form';
import { PublicOnlyRoute } from '@/features/auth/components/public-only-route';
import { getSafeRedirectPath } from '@/features/auth/redirects';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>;
}

/** Public sign-in route. The form itself owns all client interactivity. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;
  const redirectTo = getSafeRedirectPath(redirect);

  return (
    <AuthPageShell title="Welcome back" description="Sign in to continue to Invora.">
      <PublicOnlyRoute redirectTo={redirectTo}>
        <LoginForm redirectTo={redirectTo} />
      </PublicOnlyRoute>
    </AuthPageShell>
  );
}
