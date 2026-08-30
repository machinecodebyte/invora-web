import { describe, expect, it } from 'vitest';

import { ApiError, isApiError, toDisplayMessage } from '@/lib/api-error';

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('ApiError.fromResponse', () => {
  it('uses the code and message from the backend error envelope', () => {
    const error = ApiError.fromResponse(
      jsonResponse(
        {
          success: false,
          error: { code: 'validation_error', message: 'Request validation failed.' },
        },
        422,
      ),
      {
        success: false,
        error: { code: 'validation_error', message: 'Request validation failed.' },
      },
    );

    expect(error.code).toBe('validation_error');
    expect(error.message).toBe('Request validation failed.');
    expect(error.status).toBe(422);
    expect(error.kind).toBe('http');
  });

  it('falls back to safe copy when the body is not an envelope', () => {
    const error = ApiError.fromResponse(jsonResponse({ detail: 'x' }, 404), {
      detail: 'x',
    });

    expect(error.code).toBe('http_404');
    expect(error.message).toBe('The requested resource was not found.');
  });

  it('never surfaces a raw non-JSON error body to the user', () => {
    const htmlBody = '<html><body>Traceback: /srv/app/main.py line 42</body></html>';
    const error = ApiError.fromResponse(new Response(htmlBody, { status: 500 }), null);

    expect(error.message).toBe('Something went wrong. Please try again.');
    expect(error.message).not.toContain('Traceback');
    expect(error.message).not.toContain('/srv/app');
  });

  it('uses a generic server message for unmapped 5xx statuses', () => {
    const error = ApiError.fromResponse(new Response(null, { status: 502 }), null);
    expect(error.message).toBe('Something went wrong. Please try again.');
    expect(error.isServerError).toBe(true);
  });

  it('uses a generic client message for unmapped 4xx statuses', () => {
    const error = ApiError.fromResponse(new Response(null, { status: 451 }), null);
    expect(error.message).toBe('The request could not be completed.');
    expect(error.isClientError).toBe(true);
  });

  it('ignores a non-string envelope message', () => {
    const body = {
      success: false,
      error: { code: 'weird', message: { nested: true } },
    };
    const error = ApiError.fromResponse(jsonResponse(body, 400), body);

    expect(error.code).toBe('weird');
    expect(error.message).toBe('The request was invalid.');
  });

  it('truncates an excessively long backend message', () => {
    const body = { success: false, error: { code: 'x', message: 'a'.repeat(500) } };
    const error = ApiError.fromResponse(jsonResponse(body, 400), body);

    expect(error.message).toHaveLength(301);
    expect(error.message.endsWith('…')).toBe(true);
  });

  it('normalizes validation details and drops malformed entries', () => {
    const body = {
      success: false,
      error: {
        code: 'validation_error',
        message: 'Request validation failed.',
        details: [
          { field: 'email', message: 'Enter a valid email address.' },
          { field: '  ', message: 'Field-less problem.' },
          { field: 'sku' },
          'not-an-object',
        ],
      },
    };
    const error = ApiError.fromResponse(jsonResponse(body, 422), body);

    expect(error.details).toEqual([
      { field: 'email', message: 'Enter a valid email address.' },
      { field: null, message: 'Field-less problem.' },
    ]);
    expect(error.isValidationError).toBe(true);
  });

  it('captures a correlation id from response headers when present', () => {
    const error = ApiError.fromResponse(
      new Response(null, { status: 500, headers: { 'x-request-id': 'req-123' } }),
      null,
    );

    expect(error.requestId).toBe('req-123');
  });

  it('reports a null correlation id when no header is present', () => {
    const error = ApiError.fromResponse(new Response(null, { status: 500 }), null);
    expect(error.requestId).toBeNull();
  });

  it('flags 401 responses so callers can trigger re-authentication', () => {
    const error = ApiError.fromResponse(new Response(null, { status: 401 }), null);

    expect(error.isUnauthorized).toBe(true);
    expect(error.isClientError).toBe(true);
    expect(error.isServerError).toBe(false);
  });
});

describe('transport error factories', () => {
  it('builds a network error with status 0', () => {
    const cause = new TypeError('fetch failed');
    const error = ApiError.network(cause);

    expect(error.status).toBe(0);
    expect(error.code).toBe('network_error');
    expect(error.kind).toBe('network');
    expect(error.cause).toBe(cause);
    expect(error.isClientError).toBe(false);
    expect(error.isServerError).toBe(false);
  });

  it('builds a timeout error that records the elapsed budget', () => {
    const error = ApiError.timeout(5_000);

    expect(error.code).toBe('request_timeout');
    expect(error.kind).toBe('timeout');
    expect((error.cause as Error).message).toContain('5000ms');
  });

  it('builds a parse error that keeps the response status', () => {
    const error = ApiError.parse(new Response('<not json>', { status: 200 }));

    expect(error.code).toBe('invalid_response');
    expect(error.kind).toBe('parse');
    expect(error.status).toBe(200);
  });
});

describe('ApiError shape', () => {
  it('is a real Error with a stable name and empty default details', () => {
    const error = ApiError.network();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.details).toEqual([]);
  });
});

describe('isApiError', () => {
  it('accepts an ApiError', () => {
    expect(isApiError(ApiError.network())).toBe(true);
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(isApiError(value)).toBe(false);
  });
});

describe('toDisplayMessage', () => {
  it('returns the normalized message for an ApiError', () => {
    expect(toDisplayMessage(ApiError.network())).toBe(
      'Unable to reach the server. Check your connection and try again.',
    );
  });

  it('does not leak an arbitrary error message', () => {
    const message = toDisplayMessage(new Error('SQL error at /srv/app/db.py'));

    expect(message).toBe('Something went wrong. Please try again.');
    expect(message).not.toContain('/srv/app');
  });

  it('supports a caller-supplied fallback', () => {
    expect(toDisplayMessage(new Error('boom'), 'Could not load report.')).toBe(
      'Could not load report.',
    );
  });
});
