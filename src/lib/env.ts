/**
 * Client-safe environment configuration.
 *
 * Every `NEXT_PUBLIC_*` value is inlined into the browser bundle at build time,
 * so this module must only ever read non-secret variables. Secrets belong in
 * server-only environment variables and must never gain a `NEXT_PUBLIC_` prefix.
 *
 * Values are parsed lazily rather than at module load: an unset variable must
 * surface as an actionable error at the point of use, not crash an unrelated
 * page render or break `next build`.
 */

/** Recognized deployment environments. */
export const APP_ENVIRONMENTS = [
  'local',
  'development',
  'staging',
  'production',
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/** Raw, unvalidated environment values read from `process.env`. */
export interface RawPublicEnv {
  NEXT_PUBLIC_API_BASE_URL: string | undefined;
  NEXT_PUBLIC_APP_ENV: string | undefined;
}

/** Validated, normalized environment configuration. */
export interface PublicEnv {
  /** Backend origin without a trailing slash, e.g. `https://api.example.com`. */
  apiBaseUrl: string;
  appEnv: AppEnvironment;
  isProduction: boolean;
}

/** Raised when a required public environment variable is missing or malformed. */
export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigurationError';
  }
}

/**
 * Read raw values with literal `process.env.X` member access.
 *
 * Next.js replaces these expressions statically at build time; dynamic lookups
 * such as `process.env[key]` are NOT substituted and would resolve to
 * `undefined` in the browser.
 */
export function readRawPublicEnv(): RawPublicEnv {
  return {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  };
}

function parseApiBaseUrl(rawValue: string | undefined): string {
  const value = rawValue?.trim() ?? '';

  if (value === '') {
    throw new EnvironmentConfigurationError(
      'NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local and set the backend URL.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new EnvironmentConfigurationError(
      'NEXT_PUBLIC_API_BASE_URL must be an absolute URL, for example http://localhost:8000.',
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new EnvironmentConfigurationError(
      'NEXT_PUBLIC_API_BASE_URL must use the http:// or https:// protocol.',
    );
  }

  return value.replace(/\/+$/, '');
}

function parseAppEnvironment(rawValue: string | undefined): AppEnvironment {
  const value = rawValue?.trim().toLowerCase() ?? '';

  if (value === '') {
    return 'local';
  }

  const match = APP_ENVIRONMENTS.find((environment) => environment === value);
  if (match === undefined) {
    throw new EnvironmentConfigurationError(
      `NEXT_PUBLIC_APP_ENV must be one of: ${APP_ENVIRONMENTS.join(', ')}.`,
    );
  }

  return match;
}

/**
 * Validate and normalize raw environment values.
 *
 * Exported so tests can exercise validation without mutating `process.env`.
 *
 * @throws {EnvironmentConfigurationError} When a value is missing or malformed.
 */
export function parsePublicEnv(raw: RawPublicEnv): PublicEnv {
  const appEnv = parseAppEnvironment(raw.NEXT_PUBLIC_APP_ENV);

  return {
    apiBaseUrl: parseApiBaseUrl(raw.NEXT_PUBLIC_API_BASE_URL),
    appEnv,
    isProduction: appEnv === 'production',
  };
}

/**
 * Resolve the validated environment configuration.
 *
 * @throws {EnvironmentConfigurationError} When configuration is invalid.
 */
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv(readRawPublicEnv());
}

/**
 * Resolve the backend origin.
 *
 * @throws {EnvironmentConfigurationError} When `NEXT_PUBLIC_API_BASE_URL` is unusable.
 */
export function getApiBaseUrl(): string {
  return getPublicEnv().apiBaseUrl;
}

/**
 * Non-throwing configuration probe for status surfaces.
 *
 * Deliberately returns a boolean rather than the URL so diagnostic UI never
 * echoes deployment topology back to the page.
 */
export function isApiBaseUrlConfigured(): boolean {
  try {
    getApiBaseUrl();
    return true;
  } catch {
    return false;
  }
}
