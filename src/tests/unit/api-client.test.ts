import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClient, buildQueryString } from '@/lib/api-client';
import { isApiError, type ApiError } from '@/lib/api-error';
import { errorEnvelope, TEST_API_BASE_URL } from '@/tests/mocks/handlers';
import { server } from '@/tests/mocks/server';

function createClient(
  overrides: Partial<{ token: string | null; timeoutMs: number }> = {},
) {
  return new ApiClient({
    baseUrl: TEST_API_BASE_URL,
    getAccessToken: () => overrides.token ?? null,
    ...(overrides.timeoutMs === undefined
      ? {}
      : { defaultTimeoutMs: overrides.timeoutMs }),
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildQueryString', () => {
  it('returns an empty string when there are no params', () => {
    expect(buildQueryString(undefined)).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('serializes primitives', () => {
    expect(buildQueryString({ limit: 25, search: 'widget', archived: false })).toBe(
      '?limit=25&search=widget&archived=false',
    );
  });

  it('omits null and undefined values instead of sending empty keys', () => {
    expect(buildQueryString({ a: 1, b: null, c: undefined })).toBe('?a=1');
  });

  it('repeats the key for array values', () => {
    expect(buildQueryString({ status: ['pending', 'failed'] })).toBe(
      '?status=pending&status=failed',
    );
  });

  it('serializes dates as ISO strings', () => {
    expect(buildQueryString({ from: new Date('2026-03-14T00:00:00.000Z') })).toBe(
      '?from=2026-03-14T00%3A00%3A00.000Z',
    );
  });
});

describe('ApiClient success paths', () => {
  it('unwraps the backend data envelope', async () => {
    const client = createClient();

    await expect(client.get('/api/v1/health')).resolves.toEqual({ status: 'ok' });
  });

  it('returns the parsed body unchanged when there is no envelope', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/plain`, () => HttpResponse.json({ value: 7 })),
    );
    const client = createClient();

    await expect(client.get('/plain')).resolves.toEqual({ value: 7 });
  });

  it('appends query parameters to the request URL', async () => {
    let observedUrl = '';
    server.use(
      http.get(`${TEST_API_BASE_URL}/items`, ({ request }) => {
        observedUrl = request.url;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );

    await createClient().get('/items', { query: { limit: 10, offset: 20 } });

    expect(observedUrl).toBe(`${TEST_API_BASE_URL}/items?limit=10&offset=20`);
  });

  it('sends a JSON body with the correct content type', async () => {
    let contentType: string | null = null;
    let payload: unknown = null;
    server.use(
      http.post(`${TEST_API_BASE_URL}/echo`, async ({ request }) => {
        contentType = request.headers.get('content-type');
        payload = await request.json();
        return HttpResponse.json({ success: true, data: { received: true } });
      }),
    );

    await expect(createClient().post('/echo', { name: 'value' })).resolves.toEqual({
      received: true,
    });
    expect(contentType).toBe('application/json');
    expect(payload).toEqual({ name: 'value' });
  });

  it('sends FormData without overriding the multipart content type', async () => {
    let contentType: string | null = null;
    server.use(
      http.post(`${TEST_API_BASE_URL}/upload`, async ({ request }) => {
        contentType = request.headers.get('content-type');
        await request.arrayBuffer();
        return HttpResponse.json({ success: true, data: { ok: true } });
      }),
    );

    const formData = new FormData();
    formData.append('file', new Blob(['a,b\n1,2'], { type: 'text/csv' }), 'data.csv');

    await createClient().post('/upload', formData);

    expect(contentType).toContain('multipart/form-data');
    expect(contentType).toContain('boundary=');
  });

  it('supports put, patch, and delete verbs', async () => {
    const seen: string[] = [];
    for (const path of ['/put', '/patch', '/delete']) {
      server.use(
        http.all(`${TEST_API_BASE_URL}${path}`, ({ request }) => {
          seen.push(request.method);
          return HttpResponse.json({ success: true, data: { ok: true } });
        }),
      );
    }
    const client = createClient();

    await client.put('/put', { a: 1 });
    await client.patch('/patch', { a: 1 });
    await client.delete('/delete');

    expect(seen).toEqual(['PUT', 'PATCH', 'DELETE']);
  });

  it('resolves undefined for a 204 response', async () => {
    server.use(
      http.delete(
        `${TEST_API_BASE_URL}/resource`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(createClient().delete('/resource')).resolves.toBeUndefined();
  });

  it('resolves undefined for an empty 200 body', async () => {
    server.use(
      http.get(
        `${TEST_API_BASE_URL}/empty`,
        () => new HttpResponse('', { status: 200 }),
      ),
    );

    await expect(createClient().get('/empty')).resolves.toBeUndefined();
  });

  it('returns text when the text response format is requested', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/report.csv`, () =>
        HttpResponse.text('sku,quantity\nA-1,5'),
      ),
    );

    await expect(
      createClient().get<string>('/report.csv', { responseFormat: 'text' }),
    ).resolves.toBe('sku,quantity\nA-1,5');
  });

  it('returns a blob when the blob response format is requested', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/export`, () => HttpResponse.text('binary-ish')),
    );

    const blob = await createClient().get<Blob>('/export', { responseFormat: 'blob' });

    expect(blob).toBeInstanceOf(Blob);
    await expect(blob.text()).resolves.toBe('binary-ish');
  });

  it('skips body decoding entirely for the void response format', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/ping`, () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    );

    await expect(
      createClient().get('/ping', { responseFormat: 'void' }),
    ).resolves.toBeUndefined();
  });
});

describe('ApiClient headers', () => {
  it('attaches the bearer token when a session exists', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${TEST_API_BASE_URL}/secure`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await createClient({ token: 'token-abc' }).get('/secure');

    expect(authorization).toBe('Bearer token-abc');
  });

  it('omits the authorization header when there is no token', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${TEST_API_BASE_URL}/secure`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await createClient({ token: null }).get('/secure');

    expect(authorization).toBeNull();
  });

  it('omits the authorization header when auth is explicitly disabled', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${TEST_API_BASE_URL}/public`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await createClient({ token: 'token-abc' }).get('/public', { withAuth: false });

    expect(authorization).toBeNull();
  });

  it('lets per-request headers override client defaults', async () => {
    let accept: string | null = null;
    server.use(
      http.get(`${TEST_API_BASE_URL}/custom`, ({ request }) => {
        accept = request.headers.get('accept');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await createClient().get('/custom', { headers: { Accept: 'text/csv' } });

    expect(accept).toBe('text/csv');
  });

  it('applies client-level default headers', async () => {
    let clientHeader: string | null = null;
    server.use(
      http.get(`${TEST_API_BASE_URL}/defaults`, ({ request }) => {
        clientHeader = request.headers.get('x-invora-client');
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => null,
      defaultHeaders: { 'X-Invora-Client': 'web' },
    });
    await client.get('/defaults');

    expect(clientHeader).toBe('web');
  });

  it('includes browser credentials only when a request explicitly requires them', async () => {
    const observedCredentials: (RequestCredentials | undefined)[] = [];
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => null,
      fetchImpl: async (_input, init) => {
        observedCredentials.push(init.credentials);
        return HttpResponse.json({ success: true, data: { ok: true } });
      },
    });

    await client.post('/api/v1/auth/refresh', undefined, {
      withAuth: false,
      withCredentials: true,
      retryOnAuthenticationFailure: false,
    });
    await client.get('/public');

    expect(observedCredentials).toEqual(['include', undefined]);
  });
});

describe('ApiClient access-token recovery', () => {
  it('refreshes once and replays a qualifying protected request', async () => {
    let token = 'expired-token';
    const refreshAccessToken = vi.fn(async () => {
      token = 'fresh-token';
    });
    const authorizations: string[] = [];
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => token,
      refreshAccessToken,
      fetchImpl: async (_input, init) => {
        authorizations.push(new Headers(init.headers).get('authorization') ?? '');
        if (token === 'expired-token') {
          return HttpResponse.json(
            errorEnvelope('expired_access_token', 'Access token has expired.'),
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, data: { ok: true } });
      },
    });

    await expect(client.get('/protected')).resolves.toEqual({ ok: true });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authorizations).toEqual(['Bearer expired-token', 'Bearer fresh-token']);
  });

  it('coalesces simultaneous refreshes from the same shared client', async () => {
    let token = 'expired-token';
    let releaseRefresh: (() => void) | undefined;
    const refreshAccessToken = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseRefresh = () => {
            token = 'fresh-token';
            resolve();
          };
        }),
    );
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => token,
      refreshAccessToken,
      fetchImpl: async () =>
        token === 'expired-token'
          ? HttpResponse.json(
              errorEnvelope('invalid_access_token', 'Invalid access token.'),
              { status: 401 },
            )
          : HttpResponse.json({ success: true, data: { ok: true } }),
    });

    const first = client.get('/protected');
    const second = client.get('/protected');
    await waitForRefreshCall(refreshAccessToken);
    releaseRefresh?.();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('does not recover forbidden responses or disabled Auth requests', async () => {
    const refreshAccessToken = vi.fn(async () => undefined);
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => 'expired-token',
      refreshAccessToken,
      fetchImpl: async (input) =>
        String(input).endsWith('/forbidden')
          ? HttpResponse.json(errorEnvelope('forbidden', 'Not allowed.'), {
              status: 403,
            })
          : HttpResponse.json(
              errorEnvelope('invalid_access_token', 'Invalid access token.'),
              { status: 401 },
            ),
    });

    await expect(client.get('/forbidden')).rejects.toMatchObject({ status: 403 });
    await expect(
      client.post('/api/v1/auth/refresh', undefined, {
        withAuth: false,
        withCredentials: true,
        retryOnAuthenticationFailure: false,
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('retries a protected request at most once after successful recovery', async () => {
    const refreshAccessToken = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async () =>
      HttpResponse.json(
        errorEnvelope('expired_access_token', 'Access token has expired.'),
        { status: 401 },
      ),
    );
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => 'expired-token',
      refreshAccessToken,
      fetchImpl,
    });

    await expect(client.get('/protected')).rejects.toMatchObject({
      code: 'expired_access_token',
    });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

async function waitForRefreshCall(
  refreshAccessToken: ReturnType<typeof vi.fn>,
): Promise<void> {
  await vi.waitFor(() => {
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });
}

describe('ApiClient error handling', () => {
  it('throws a normalized ApiError for an error envelope', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/forbidden`, () =>
        HttpResponse.json(errorEnvelope('forbidden', 'Not allowed.'), { status: 403 }),
      ),
    );

    const error = await createClient()
      .get('/forbidden')
      .catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).code).toBe('forbidden');
    expect((error as ApiError).message).toBe('Not allowed.');
  });

  it('surfaces validation details from a 422 response', async () => {
    server.use(
      http.post(`${TEST_API_BASE_URL}/validate`, () =>
        HttpResponse.json(
          errorEnvelope('validation_error', 'Request validation failed.', [
            { field: 'email', message: 'Enter a valid email address.' },
          ]),
          { status: 422 },
        ),
      ),
    );

    const error = (await createClient()
      .post('/validate', { email: 'bad' })
      .catch((caught: unknown) => caught)) as ApiError;

    expect(error.isValidationError).toBe(true);
    expect(error.details).toEqual([
      { field: 'email', message: 'Enter a valid email address.' },
    ]);
  });

  it('does not leak an HTML error page into the thrown message', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/broken`, () =>
        HttpResponse.html('<html>Traceback: /srv/app/main.py</html>', { status: 500 }),
      ),
    );

    const error = (await createClient()
      .get('/broken')
      .catch((caught: unknown) => caught)) as ApiError;

    expect(error.message).toBe('Something went wrong. Please try again.');
    expect(error.message).not.toContain('Traceback');
  });

  it('throws a parse error when a successful response is not valid JSON', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/malformed`, () =>
        HttpResponse.text('{not json', { status: 200 }),
      ),
    );

    const error = (await createClient()
      .get('/malformed')
      .catch((caught: unknown) => caught)) as ApiError;

    expect(error.kind).toBe('parse');
    expect(error.code).toBe('invalid_response');
  });

  it('throws a network error when the request cannot reach the server', async () => {
    server.use(http.get(`${TEST_API_BASE_URL}/down`, () => HttpResponse.error()));

    const error = (await createClient()
      .get('/down')
      .catch((caught: unknown) => caught)) as ApiError;

    expect(error.kind).toBe('network');
    expect(error.code).toBe('network_error');
    expect(error.status).toBe(0);
  });
});

describe('ApiClient cancellation', () => {
  it('throws a timeout ApiError when the request exceeds its budget', async () => {
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => null,
      defaultTimeoutMs: 10,
      // Never settles, so only the timeout can end the request.
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    });

    const error = (await client
      .get('/slow')
      .catch((caught: unknown) => caught)) as ApiError;

    expect(isApiError(error)).toBe(true);
    expect(error.kind).toBe('timeout');
    expect(error.code).toBe('request_timeout');
  });

  it('rethrows the original AbortError when the caller cancels', async () => {
    const controller = new AbortController();
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => null,
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    });

    const pending = client.get('/slow', { signal: controller.signal });
    controller.abort();
    const error = (await pending.catch((caught: unknown) => caught)) as Error;

    // Cancellation must stay an AbortError so TanStack Query treats it as
    // cancelled rather than failed.
    expect(isApiError(error)).toBe(false);
    expect(error.name).toBe('AbortError');
  });

  it('does not reach the network when the caller signal is already aborted', async () => {
    const observedSignals: (AbortSignal | null | undefined)[] = [];
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => null,
      fetchImpl: (_input, init) => {
        observedSignals.push(init.signal);
        if (init.signal?.aborted === true) {
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        return Promise.resolve(HttpResponse.json({ success: true, data: {} }));
      },
    });

    const error = (await client
      .get('/slow', { signal: AbortSignal.abort() })
      .catch((caught: unknown) => caught)) as Error;

    expect(observedSignals[0]?.aborted).toBe(true);
    expect(error.name).toBe('AbortError');
  });

  it('does not time out when a non-positive budget disables the timeout', async () => {
    const client = new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => null,
      defaultTimeoutMs: 0,
      fetchImpl: async (_input, init) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 25);
        });
        if (init.signal?.aborted === true) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return HttpResponse.json({ success: true, data: { ok: true } });
      },
    });

    await expect(client.get('/slow')).resolves.toEqual({ ok: true });
  });
});

describe('ApiClient base URL resolution', () => {
  it('resolves a function base URL on every request', async () => {
    const resolve = vi.fn(() => TEST_API_BASE_URL);
    const client = new ApiClient({ baseUrl: resolve, getAccessToken: () => null });

    await client.get('/api/v1/health');
    await client.get('/api/v1/health');

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('joins the base URL and path without duplicating slashes', async () => {
    let observedUrl = '';
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/thing`, ({ request }) => {
        observedUrl = request.url;
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    const client = new ApiClient({
      baseUrl: `${TEST_API_BASE_URL}/`,
      getAccessToken: () => null,
    });
    await client.get('/api/v1/thing');

    expect(observedUrl).toBe(`${TEST_API_BASE_URL}/api/v1/thing`);
  });
});
