'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { logger } from '@/lib/logger';

/**
 * Route-level error boundary.
 *
 * Only the digest is logged, never the message or stack: in production those may
 * contain server-side detail that must not reach the browser console. The
 * digest is the identifier that correlates with the server log entry.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('route_error_boundary', { digest: error.digest ?? null });
  }, [error.digest]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <ErrorState
        className="max-w-lg"
        description="This page could not be loaded. Try again, and contact support if the problem continues."
        onRetry={reset}
      />
    </div>
  );
}
