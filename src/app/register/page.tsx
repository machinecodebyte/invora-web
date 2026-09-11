import type { Metadata } from 'next';

import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { PublicOnlyRoute } from '@/features/auth/components/public-only-route';
import { RegisterForm } from '@/features/auth/components/register-form';
import { getSafeRedirectPath } from '@/features/auth/redirects';

export const metadata: Metadata = {
  title: 'Create account',
};

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>;
}

/** Public registration route; backend enrollment is intentionally adapter-owned. */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { redirect } = await searchParams;
  const redirectTo = getSafeRedirectPath(redirect);

  return (
    <AuthPageShell
      title="Create your account"
      description="Set up your Invora workspace access."
    >
      <PublicOnlyRoute redirectTo={redirectTo}>
        <RegisterForm redirectTo={redirectTo} />
      </PublicOnlyRoute>
    </AuthPageShell>
  );
}
