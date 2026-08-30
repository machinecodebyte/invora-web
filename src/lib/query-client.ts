import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api-error';

/** Maximum automatic retries for a failed query. */
const MAX_QUERY_RETRIES = 2;

/** How long fetched data is served without a background refetch. */
const DEFAULT_STALE_TIME_MS = 60_000;

/** How long unused cache entries are retained before garbage collection. */
const DEFAULT_GC_TIME_MS = 5 * 60_000;

/** Statuses worth retrying despite being client errors. */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

/**
 * Retry policy shared by every query.
 *
 * Client errors are deterministic - a 401, 403, 404, or 422 will fail again on
 * retry - so only transport failures, server errors, timeouts, and throttling
 * are retried. Exported for direct unit testing.
 */
export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) {
    return false;
  }

  if (!isApiError(error)) {
    // Unknown failures (rendering or serialization bugs) are not transport
    // problems and will not resolve themselves.
    return false;
  }

  if (error.isClientError) {
    return RETRYABLE_CLIENT_STATUSES.has(error.status);
  }

  return true;
}

/** Exponential backoff capped at 30s. */
export function computeRetryDelay(attemptIndex: number): number {
  return Math.min(1_000 * 2 ** attemptIndex, 30_000);
}

/**
 * Build a QueryClient configured for a data-dense dashboard.
 *
 * A new instance is created per browser session (and per test) rather than
 * shared at module scope, so server rendering never leaks one user's cache into
 * another request.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        retry: shouldRetryRequest,
        retryDelay: computeRetryDelay,
        // Dashboard panels are read repeatedly; refetching on every focus change
        // produces request storms without improving freshness.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        // Mutations are not idempotent by default; retrying risks duplicate writes.
        retry: false,
      },
    },
  });
}
