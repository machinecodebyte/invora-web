'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/hooks';
import { ROUTES } from '@/lib/constants';

export interface PublicOnlyRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/** Redirect already-authenticated users away from public Auth routes. */
export function PublicOnlyRoute({
  children,
  redirectTo = ROUTES.dashboard,
}: PublicOnlyRouteProps) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, status]);

  if (status === 'initializing' || status === 'authenticated') {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Checking your session" className="text-primary" />
      </div>
    );
  }

  return children;
}
