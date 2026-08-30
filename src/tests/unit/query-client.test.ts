import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-error';
import {
  computeRetryDelay,
  createQueryClient,
  shouldRetryRequest,
} from '@/lib/query-client';

function httpError(status: number): ApiError {
  return ApiError.fromResponse(new Response(null, { status }), null);
}

describe('shouldRetryRequest', () => {
  it('retries server errors', () => {
    expect(shouldRetryRequest(0, httpError(500))).toBe(true);
    expect(shouldRetryRequest(1, httpError(503))).toBe(true);
  });

  it('retries network and timeout failures', () => {
    expect(shouldRetryRequest(0, ApiError.network())).toBe(true);
    expect(shouldRetryRequest(0, ApiError.timeout(1_000))).toBe(true);
  });

  it.each([401, 403, 404, 409, 422])(
    'does not retry the deterministic client error %i',
    (status) => {
      expect(shouldRetryRequest(0, httpError(status))).toBe(false);
    },
  );

  it.each([408, 429])('retries the transient client error %i', (status) => {
    expect(shouldRetryRequest(0, httpError(status))).toBe(true);
  });

  it('stops after the retry budget is exhausted', () => {
    expect(shouldRetryRequest(2, httpError(500))).toBe(false);
    expect(shouldRetryRequest(3, ApiError.network())).toBe(false);
  });

  it('does not retry non-transport errors', () => {
    expect(shouldRetryRequest(0, new Error('render bug'))).toBe(false);
    expect(shouldRetryRequest(0, undefined)).toBe(false);
  });
});

describe('computeRetryDelay', () => {
  it('backs off exponentially', () => {
    expect(computeRetryDelay(0)).toBe(1_000);
    expect(computeRetryDelay(1)).toBe(2_000);
    expect(computeRetryDelay(2)).toBe(4_000);
  });

  it('caps the delay at 30 seconds', () => {
    expect(computeRetryDelay(10)).toBe(30_000);
  });
});

describe('createQueryClient', () => {
  it('applies dashboard-appropriate query defaults', () => {
    const defaults = createQueryClient().getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(60_000);
    expect(defaults?.gcTime).toBe(300_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.refetchOnReconnect).toBe(true);
    expect(defaults?.retry).toBe(shouldRetryRequest);
    expect(defaults?.retryDelay).toBe(computeRetryDelay);
  });

  it('never retries mutations, which may not be idempotent', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('returns an independent instance per call so caches cannot be shared', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
