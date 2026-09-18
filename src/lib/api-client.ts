import { getAccessToken } from '@/lib/auth';
import { ApiError } from '@/lib/api-error';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/lib/constants';
import { getApiBaseUrl } from '@/lib/env';
import { joinUrlPath } from '@/lib/utils';
import type { HttpMethod, QueryParamValue, QueryParams } from '@/types/api';

/** How the response body should be interpreted. */
export type ResponseFormat = 'json' | 'text' | 'blob' | 'void';

/** Minimal `fetch` shape, so tests and server runtimes can inject their own. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Per-request options. */
export interface RequestConfig {
  /** Values appended to the query string; `null`/`undefined` entries are dropped. */
  query?: QueryParams;
  /** Additional headers; these override client defaults. */
  headers?: Record<string, string>;
  /** Caller-owned cancellation signal (TanStack Query supplies one). */
  signal?: AbortSignal;
  /** Overrides the client timeout. Values `<= 0` disable the timeout entirely. */
  timeoutMs?: number;
  /** Defaults to `'json'`. */
  responseFormat?: ResponseFormat;
  /** Set to `false` to send the request without the bearer token. */
  withAuth?: boolean;
  /**
   * Send browser credentials with this request. This is reserved for the
   * HttpOnly refresh-session boundary; feature code must never read or attach
   * refresh-token values itself.
   */
  withCredentials?: boolean;
  /**
   * Disables bounded access-token recovery for this request. Auth endpoints
   * set this to false to prevent recursive refresh attempts.
   */
  retryOnAuthenticationFailure?: boolean;
}

/** Request bodies passed straight to `fetch` without JSON encoding. */
type PassthroughBody = FormData | URLSearchParams | Blob | ArrayBuffer;

/** Body accepted by mutating verbs. */
export type RequestBody =
  PassthroughBody | Record<string, unknown> | readonly unknown[] | null;

export interface ApiClientOptions {
  /**
   * Backend origin, or a resolver called per request.
   *
   * Defaults to a lazy read of `NEXT_PUBLIC_API_BASE_URL`, so importing this
   * module never throws when the environment is not yet configured.
   */
  baseUrl?: string | (() => string);
  defaultTimeoutMs?: number;
  /** Supplies the bearer token; defaults to the shared auth store. */
  getAccessToken?: () => string | null;
  fetchImpl?: FetchLike;
  defaultHeaders?: Record<string, string>;
  /**
   * Obtains a fresh in-memory access token after a qualifying 401 response.
   * The shared client resolves this lazily from the Auth provider.
   */
  refreshAccessToken?: () => Promise<void>;
}

export type AuthRefreshHandler = () => Promise<void>;

let registeredAuthRefreshHandler: AuthRefreshHandler | null = null;

/**
 * Register the single Auth-owned refresh coordinator used by the shared
 * transport. The cleanup guard prevents an unmounted provider from clearing a
 * newer provider registration.
 */
export function registerAuthRefreshHandler(handler: AuthRefreshHandler): () => void {
  registeredAuthRefreshHandler = handler;

  return () => {
    if (registeredAuthRefreshHandler === handler) {
      registeredAuthRefreshHandler = null;
    }
  };
}

function refreshFromRegisteredHandler(): Promise<void> {
  if (registeredAuthRefreshHandler === null) {
    return Promise.reject(new Error('Auth refresh is not initialized.'));
  }
  return registeredAuthRefreshHandler();
}

const RECOVERABLE_AUTH_ERROR_CODES = new Set([
  'invalid_access_token',
  'expired_access_token',
]);

function isPassthroughBody(body: unknown): body is PassthroughBody {
  return (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    body instanceof ArrayBuffer
  );
}

function serializeQueryParamValue(value: QueryParamValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/** Serialize query params; arrays become repeated keys, empty values are omitted. */
export function buildQueryString(query: QueryParams | undefined): string {
  if (query === undefined) {
    return '';
  }

  const searchParams = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      const serialized = serializeQueryParamValue(value);
      if (serialized !== null) {
        searchParams.append(key, serialized);
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString === '' ? '' : `?${queryString}`;
}

function hasEnvelope(value: unknown): value is { success: boolean; data: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success: unknown }).success === true &&
    'data' in value
  );
}

/**
 * Typed HTTP client for the Invora backend.
 *
 * Owns transport concerns only - URL composition, auth headers, timeouts, JSON
 * handling, envelope unwrapping, and error normalization. It intentionally
 * knows nothing about business endpoints; each feature module builds its own
 * request functions on top of this client.
 */
export class ApiClient {
  private readonly baseUrl: string | (() => string);
  private readonly defaultTimeoutMs: number;
  private readonly readAccessToken: () => string | null;
  private readonly fetchImpl: FetchLike | undefined;
  private readonly defaultHeaders: Readonly<Record<string, string>>;
  private readonly refreshAccessToken: () => Promise<void>;
  private activeRefresh: Promise<void> | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? getApiBaseUrl;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.readAccessToken = options.getAccessToken ?? getAccessToken;
    this.fetchImpl = options.fetchImpl;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.refreshAccessToken =
      options.refreshAccessToken ?? refreshFromRegisteredHandler;
  }

  get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse> {
    return this.request<TResponse>('GET', path, config);
  }

  post<TResponse>(
    path: string,
    body?: RequestBody,
    config?: RequestConfig,
  ): Promise<TResponse> {
    return this.request<TResponse>('POST', path, config, body);
  }

  put<TResponse>(
    path: string,
    body?: RequestBody,
    config?: RequestConfig,
  ): Promise<TResponse> {
    return this.request<TResponse>('PUT', path, config, body);
  }

  patch<TResponse>(
    path: string,
    body?: RequestBody,
    config?: RequestConfig,
  ): Promise<TResponse> {
    return this.request<TResponse>('PATCH', path, config, body);
  }

  delete<TResponse>(path: string, config?: RequestConfig): Promise<TResponse> {
    return this.request<TResponse>('DELETE', path, config);
  }

  /**
   * Execute a request and return its decoded payload.
   *
   * For JSON responses wrapped in the backend envelope, the `data` member is
   * unwrapped; other shapes are returned as parsed.
   *
   * @throws {ApiError} For HTTP failures, network failures, timeouts, and
   * unparseable bodies. Caller-initiated aborts reject with the original
   * `AbortError` so query cancellation keeps working.
   */
  async request<TResponse>(
    method: HttpMethod,
    path: string,
    config: RequestConfig = {},
    body?: RequestBody,
  ): Promise<TResponse> {
    const url = this.buildUrl(path, config.query);
    const timeoutMs = config.timeoutMs ?? this.defaultTimeoutMs;
    const responseFormat = config.responseFormat ?? 'json';

    return this.requestOnce<TResponse>(
      url,
      method,
      config,
      body,
      timeoutMs,
      responseFormat,
      false,
    );
  }

  private async requestOnce<TResponse>(
    url: string,
    method: HttpMethod,
    config: RequestConfig,
    body: RequestBody | undefined,
    timeoutMs: number,
    responseFormat: ResponseFormat,
    hasRetriedAfterRefresh: boolean,
  ): Promise<TResponse> {
    const response = await this.executeFetch(url, method, config, body, timeoutMs);

    if (!response.ok) {
      const error = ApiError.fromResponse(response, await readBodySafely(response));

      if (this.shouldRecoverAuthentication(error, config, hasRetriedAfterRefresh)) {
        try {
          await this.coalesceRefresh();
        } catch {
          // Preserve the original protected-request failure. The Auth provider
          // has already cleared its session and auth-scoped cache.
          throw error;
        }

        return this.requestOnce<TResponse>(
          url,
          method,
          config,
          body,
          timeoutMs,
          responseFormat,
          true,
        );
      }

      throw error;
    }

    // Single cast boundary: the transport cannot verify the caller's declared
    // payload type, so decoding is done as `unknown` and asserted once here.
    return (await this.decode(response, responseFormat)) as TResponse;
  }

  private shouldRecoverAuthentication(
    error: ApiError,
    config: RequestConfig,
    hasRetriedAfterRefresh: boolean,
  ): boolean {
    return (
      !hasRetriedAfterRefresh &&
      config.withAuth !== false &&
      config.retryOnAuthenticationFailure !== false &&
      error.status === 401 &&
      RECOVERABLE_AUTH_ERROR_CODES.has(error.code)
    );
  }

  private coalesceRefresh(): Promise<void> {
    if (this.activeRefresh === null) {
      this.activeRefresh = this.refreshAccessToken().finally(() => {
        this.activeRefresh = null;
      });
    }
    return this.activeRefresh;
  }

  private buildUrl(path: string, query: QueryParams | undefined): string {
    const baseUrl = typeof this.baseUrl === 'function' ? this.baseUrl() : this.baseUrl;
    return `${joinUrlPath(baseUrl, path)}${buildQueryString(query)}`;
  }

  private buildHeaders(
    config: RequestConfig,
    body: RequestBody | undefined,
    responseFormat: ResponseFormat,
  ): Headers {
    const headers = new Headers();

    headers.set('Accept', responseFormat === 'blob' ? '*/*' : 'application/json');

    for (const [key, value] of Object.entries(this.defaultHeaders)) {
      headers.set(key, value);
    }

    // Passthrough bodies carry their own content type (FormData needs the
    // browser-generated multipart boundary), so only JSON is declared here.
    if (body !== undefined && body !== null && !isPassthroughBody(body)) {
      headers.set('Content-Type', 'application/json');
    }

    if (config.withAuth !== false) {
      const token = this.readAccessToken();
      if (token !== null && token !== '') {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    for (const [key, value] of Object.entries(config.headers ?? {})) {
      headers.set(key, value);
    }

    return headers;
  }

  private async executeFetch(
    url: string,
    method: HttpMethod,
    config: RequestConfig,
    body: RequestBody | undefined,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const callerSignal = config.signal;
    const onCallerAbort = (): void => controller.abort();

    let timedOut = false;
    const timeoutId =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : undefined;

    if (callerSignal !== undefined) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }

    const init: RequestInit = {
      method,
      headers: this.buildHeaders(config, body, config.responseFormat ?? 'json'),
      signal: controller.signal,
      ...(config.withCredentials === true ? { credentials: 'include' } : {}),
    };

    if (body !== undefined && body !== null) {
      init.body = isPassthroughBody(body) ? body : JSON.stringify(body);
    }

    const performFetch = this.fetchImpl ?? globalThis.fetch;

    try {
      return await performFetch(url, init);
    } catch (error) {
      // A caller-owned abort must stay an AbortError: TanStack Query relies on
      // it to distinguish cancellation from failure.
      if (callerSignal?.aborted === true) {
        throw error;
      }
      if (timedOut) {
        throw ApiError.timeout(timeoutMs);
      }
      throw ApiError.network(error);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  private async decode(
    response: Response,
    responseFormat: ResponseFormat,
  ): Promise<unknown> {
    if (responseFormat === 'void') {
      return undefined;
    }

    if (responseFormat === 'blob') {
      return response.blob();
    }

    if (responseFormat === 'text') {
      return response.text();
    }

    if (response.status === 204 || response.status === 205) {
      return undefined;
    }

    const rawText = await response.text();
    if (rawText.trim() === '') {
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw ApiError.parse(response, error);
    }

    return hasEnvelope(parsed) ? parsed.data : parsed;
  }
}

/** Best-effort body read for error responses; never throws. */
async function readBodySafely(response: Response): Promise<unknown> {
  try {
    const rawText = await response.text();
    if (rawText.trim() === '') {
      return null;
    }
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

/**
 * Shared client instance used by feature modules.
 *
 * The base URL resolves lazily on first request, so an unconfigured
 * environment surfaces as an actionable error at call time rather than at
 * import time.
 */
export const apiClient = new ApiClient();
