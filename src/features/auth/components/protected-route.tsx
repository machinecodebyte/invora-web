'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/hooks';
import { ROUTES } from '@/lib/constants';

export interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Client-side access boundary for authenticated application routes.
 *
 * This controls UX only. Backend APIs must independently authenticate and
 * authorize every request when the HTTP adapter is implemented.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.toString();
  const returnTo = `${pathname}${search === '' ? '' : `?${search}`}`;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${ROUTES.login}?redirect=${encodeURIComponent(returnTo)}`);
    }
  }, [returnTo, router, status]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <Spinner label="Checking access" className="text-primary" />
      </div>
    );
  }

  return children;
}
