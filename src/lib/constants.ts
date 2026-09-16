/** Application-level constants. Business constants belong to their feature. */

export const APP_NAME = 'Invora';

export const APP_TAGLINE = 'Predict · Optimize · Replenish';

export const APP_DESCRIPTION =
  'AI-based demand forecasting and inventory reorder recommendation system.';

/**
 * Version prefix of the backend HTTP API.
 *
 * `NEXT_PUBLIC_API_BASE_URL` holds only the server origin, so feature modules
 * compose request paths as `` `${API_V1_PREFIX}/<resource>` ``.
 */
export const API_V1_PREFIX = '/api/v1';

/** Default per-request timeout for the API client, in milliseconds. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

/** Default auto-dismiss delay for toast notifications, in milliseconds. */
export const DEFAULT_TOAST_DURATION_MS = 5_000;

/** Anchor id used by the skip-to-content link and the main landmark. */
export const MAIN_CONTENT_ELEMENT_ID = 'main-content';

/** Application routes owned by the foundation. Feature routes are added by their module. */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  products: '/products',
  inventory: '/inventory',
  sales: '/sales',
  salesUpload: '/sales/upload',
  forecastRuns: '/forecasts/runs',
  forecastResults: '/forecasts/results',
  recommendations: '/recommendations',
  reports: '/reports',
} as const;
