import type { ApiValidationIssue } from '@/types/api';

/** Classification of a failed request, used for retry and messaging decisions. */
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'parse';

/** Maximum length of a backend-provided message surfaced to users. */
const MAX_MESSAGE_LENGTH = 300;

/** Response headers that may carry a correlation id, in priority order. */
const REQUEST_ID_HEADERS = ['x-request-id', 'x-correlation-id'] as const;

/**
 * User-safe fallback copy per status class.
 *
 * Used whenever the response does not carry the backend's error envelope, so an
 * HTML error page, proxy response, or stack trace is never rendered to a user.
 */
const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: 'The request was invalid.',
  401: 'Your session is no longer valid. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state of the data.',
  413: 'The submitted file or payload is too large.',
  422: 'Some of the submitted values are invalid.',
  429: 'Too many requests. Please try again in a moment.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

const GENERIC_CLIENT_MESSAGE = 'The request could not be completed.';
const GENERIC_SERVER_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE =
  'Unable to reach the server. Check your connection and try again.';
const TIMEOUT_MESSAGE = 'The request took too long to complete. Please try again.';
const PARSE_MESSAGE = 'The server returned an unexpected response.';

function safeStatusMessage(status: number): string {
  const known = STATUS_MESSAGES[status];
  if (known !== undefined) {
    return known;
  }
  return status >= 500 ? GENERIC_SERVER_MESSAGE : GENERIC_CLIENT_MESSAGE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed.length > MAX_MESSAGE_LENGTH
    ? `${trimmed.slice(0, MAX_MESSAGE_LENGTH)}…`
    : trimmed;
}

function normalizeValidationIssues(value: unknown): ApiValidationIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const issues: ApiValidationIssue[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const message = normalizeMessage(entry.message);
    if (message === null) {
      continue;
    }
    const field =
      typeof entry.field === 'string' && entry.field.trim() !== ''
        ? entry.field.trim()
        : null;
    issues.push({ field, message });
  }
  return issues;
}

function readRequestId(headers: Headers | undefined): string | null {
  if (headers === undefined) {
    return null;
  }
  for (const headerName of REQUEST_ID_HEADERS) {
    const value = headers.get(headerName);
    if (value !== null && value.trim() !== '') {
      return value.trim();
    }
  }
  return null;
}

interface ApiErrorInit {
  message: string;
  status: number;
  code: string;
  kind: ApiErrorKind;
  details?: readonly ApiValidationIssue[];
  requestId?: string | null;
  cause?: unknown;
}

/**
 * Normalized transport error for every failed API interaction.
 *
 * `message` is always safe to display: it comes from the backend's error
 * envelope (whose messages are user-facing by contract) or from a status-based
 * fallback. Raw response bodies are never interpolated into it, so internal
 * details cannot leak into the UI.
 */
export class ApiError extends Error {
  /** HTTP status, or `0` for transport failures that never produced a response. */
  readonly status: number;

  /** Machine-readable code, e.g. `validation_error`, `network_error`, `http_500`. */
  readonly code: string;

  readonly kind: ApiErrorKind;

  /** Field-level validation problems, when the backend reports them. */
  readonly details: readonly ApiValidationIssue[];

  /** Correlation id from response headers, for support and log matching. */
  readonly requestId: string | null;

  constructor(init: ApiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.kind = init.kind;
    this.details = init.details ?? [];
    this.requestId = init.requestId ?? null;
  }

  /** True for statuses where the caller sent something unacceptable. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** True for statuses where the server failed to fulfil a valid request. */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** True when the user's session is missing, expired, or rejected. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the failure carries field-level validation feedback. */
  get isValidationError(): boolean {
    return this.status === 422 || this.details.length > 0;
  }

  /**
   * Build an error from a non-OK response and its already-parsed body.
   *
   * Recognizes the backend envelope `{ success: false, error: { code, message } }`
   * and falls back to safe status copy for any other shape.
   */
  static fromResponse(response: Response, body: unknown): ApiError {
    const requestId = readRequestId(response.headers);
    const envelopeError = isRecord(body) && isRecord(body.error) ? body.error : null;

    const code =
      envelopeError !== null && typeof envelopeError.code === 'string'
        ? envelopeError.code
        : `http_${response.status}`;

    const message =
      (envelopeError === null ? null : normalizeMessage(envelopeError.message)) ??
      safeStatusMessage(response.status);

    return new ApiError({
      message,
      status: response.status,
      code,
      kind: 'http',
      details:
        envelopeError === null ? [] : normalizeValidationIssues(envelopeError.details),
      requestId,
    });
  }

  /** The request never reached the server (DNS failure, offline, CORS rejection). */
  static network(cause?: unknown): ApiError {
    return new ApiError({
      message: NETWORK_MESSAGE,
      status: 0,
      code: 'network_error',
      kind: 'network',
      cause,
    });
  }

  /** The request exceeded its configured timeout and was aborted. */
  static timeout(timeoutMs: number): ApiError {
    return new ApiError({
      message: TIMEOUT_MESSAGE,
      status: 0,
      code: 'request_timeout',
      kind: 'timeout',
      cause: new Error(`Request aborted after ${timeoutMs}ms`),
    });
  }

  /** A successful response carried a body that could not be parsed. */
  static parse(response: Response, cause?: unknown): ApiError {
    return new ApiError({
      message: PARSE_MESSAGE,
      status: response.status,
      code: 'invalid_response',
      kind: 'parse',
      requestId: readRequestId(response.headers),
      cause,
    });
  }
}

/** Type guard for {@link ApiError}. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/**
 * Extract a display-safe message from any thrown value.
 *
 * Non-{@link ApiError} values are deliberately not stringified: an arbitrary
 * runtime error message can contain internal paths or payload fragments.
 */
export function toDisplayMessage(
  error: unknown,
  fallback: string = GENERIC_SERVER_MESSAGE,
): string {
  return isApiError(error) ? error.message : fallback;
}
