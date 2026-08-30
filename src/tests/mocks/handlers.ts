import { http, HttpResponse } from 'msw';

/**
 * Base URL used by tests that exercise the API client.
 *
 * Fixed and unrelated to any real deployment so tests never depend on local
 * environment configuration.
 */
export const TEST_API_BASE_URL = 'http://api.invora.test';

/**
 * Default handlers.
 *
 * Only the infrastructure-level health endpoint is mocked. No product, sales,
 * inventory, forecast, or recommendation fixtures exist here: feature modules
 * add their own handlers when they are implemented.
 */
export const handlers = [
  http.get(`${TEST_API_BASE_URL}/api/v1/health`, () =>
    HttpResponse.json({ success: true, data: { status: 'ok' } }),
  ),
];

/** Backend-shaped error envelope, for testing error normalization. */
export function errorEnvelope(code: string, message: string, details?: unknown) {
  return {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}
