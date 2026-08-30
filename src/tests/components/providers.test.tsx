import { useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { AppProviders } from '@/app/providers';
import { ApiClient } from '@/lib/api-client';
import { API_V1_PREFIX } from '@/lib/constants';
import { errorEnvelope, TEST_API_BASE_URL } from '@/tests/mocks/handlers';
import { server } from '@/tests/mocks/server';

const client = new ApiClient({
  baseUrl: TEST_API_BASE_URL,
  getAccessToken: () => null,
});

interface HealthStatus {
  status: string;
}

/**
 * Consumer that exercises the whole foundation data path: provider → hook →
 * API client → normalized error.
 */
function HealthProbe() {
  const { data, error, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => client.get<HealthStatus>(`${API_V1_PREFIX}/health`),
  });

  if (isPending) {
    return <p>Loading…</p>;
  }
  if (isError) {
    return <p role="alert">{error.message}</p>;
  }
  return <p>Status: {data.status}</p>;
}

describe('AppProviders', () => {
  it('makes a QueryClient available so consumers can run queries', async () => {
    render(
      <AppProviders>
        <HealthProbe />
      </AppProviders>,
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('Status: ok')).toBeInTheDocument();
  });

  it('surfaces a normalized, display-safe message when a query fails', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}${API_V1_PREFIX}/health`, () =>
        HttpResponse.json(errorEnvelope('forbidden', 'Not allowed.'), { status: 403 }),
      ),
    );

    render(
      <AppProviders>
        <HealthProbe />
      </AppProviders>,
    );

    // 403 is deterministic, so the retry policy must not delay the failure.
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed.');
  });
});
