import { isApiError } from '@/lib/api-error';
import { apiClient, type RequestBody, type RequestConfig } from '@/lib/api-client';
import { expiresAtFromNow, type AuthSession, type AuthUser } from '@/lib/auth';
import type { LoginCredentials, RegistrationData } from '@/features/auth/types';

const AUTH_BASE_PATH = '/api/v1/auth';

export type AuthAdapterErrorCode =
  | 'authentication_unavailable'
  | 'invalid_credentials'
  | 'registration_failed'
  | 'session_recovery_failed'
  | 'logout_failed';

/** An adapter error containing presentation-safe, feature-level information. */
export class AuthAdapterError extends Error {
  constructor(
    public readonly code: AuthAdapterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthAdapterError';
  }
}

export interface AuthApiClient {
  get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse>;
  post<TResponse>(
    path: string,
    body?: RequestBody,
    config?: RequestConfig,
  ): Promise<TResponse>;
}

/** Stable UI contract; no refresh-token values are exposed to callers. */
export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession>;
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(data: RegistrationData): Promise<AuthSession>;
  logout(): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sessionRecoveryError(): AuthAdapterError {
  return new AuthAdapterError(
    'session_recovery_failed',
    'Your session could not be restored. Please sign in again.',
  );
}

function readRequiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw sessionRecoveryError();
  }
  return value;
}

function parseUser(value: unknown): AuthUser {
  if (!isRecord(value)) {
    throw sessionRecoveryError();
  }

  const fullName = value.full_name;
  if (fullName !== null && typeof fullName !== 'string' && fullName !== undefined) {
    throw sessionRecoveryError();
  }

  return {
    id: readRequiredString(value.id),
    email: readRequiredString(value.email),
    fullName: typeof fullName === 'string' ? fullName : null,
  };
}

function parseAuthPayload(value: unknown): AuthSession {
  if (!isRecord(value) || !isRecord(value.tokens)) {
    throw sessionRecoveryError();
  }

  const expiresIn = value.tokens.expires_in;
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw sessionRecoveryError();
  }

  return {
    accessToken: readRequiredString(value.tokens.access_token),
    expiresAt: expiresAtFromNow(expiresIn),
    user: parseUser(value.user),
  };
}

function parseMePayload(value: unknown): AuthUser {
  if (!isRecord(value)) {
    throw sessionRecoveryError();
  }
  return parseUser(value.user);
}

function authRequestConfig(): RequestConfig {
  return {
    withAuth: false,
    withCredentials: true,
    retryOnAuthenticationFailure: false,
  };
}

function loginError(error: unknown): AuthAdapterError {
  if (isApiError(error) && error.status === 401) {
    return new AuthAdapterError('invalid_credentials', 'Invalid email or password.');
  }
  return new AuthAdapterError(
    'authentication_unavailable',
    'Authentication is temporarily unavailable. Please try again.',
  );
}

function registrationError(): AuthAdapterError {
  return new AuthAdapterError(
    'registration_failed',
    'We could not create your account. Please try again.',
  );
}

function logoutError(): AuthAdapterError {
  return new AuthAdapterError(
    'logout_failed',
    'We could not complete sign out with the server. Local session data was cleared.',
  );
}

function expectedSessionFailure(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

function buildRegistrationPayload(data: RegistrationData): Record<string, string> {
  const payload: Record<string, string> = {
    email: data.email,
    password: data.password,
  };
  const fullName = data.fullName?.trim();
  if (fullName !== undefined && fullName !== '') {
    payload.full_name = fullName;
  }
  return payload;
}

/**
 * Real browser Auth adapter. It uses the shared ApiClient for every request:
 * access tokens remain memory-only, while the browser sends the HttpOnly
 * refresh cookie only on the Auth refresh and logout transport boundary.
 */
export function createHttpAuthService(client: AuthApiClient = apiClient): AuthService {
  const refreshSession = async (): Promise<AuthSession> => {
    try {
      const payload = await client.post<unknown>(
        AUTH_BASE_PATH + '/refresh',
        undefined,
        authRequestConfig(),
      );
      return parseAuthPayload(payload);
    } catch (error) {
      if (error instanceof AuthAdapterError) {
        throw error;
      }
      throw sessionRecoveryError();
    }
  };

  return {
    async getSession(): Promise<AuthSession | null> {
      try {
        const refreshed = await refreshSession();
        const mePayload = await client.get<unknown>(AUTH_BASE_PATH + '/me', {
          ...authRequestConfig(),
          headers: { Authorization: 'Bearer ' + refreshed.accessToken },
        });
        return { ...refreshed, user: parseMePayload(mePayload) };
      } catch (error) {
        if (expectedSessionFailure(error)) {
          return null;
        }
        return null;
      }
    },

    refreshSession,

    async login(credentials: LoginCredentials): Promise<AuthSession> {
      try {
        const payload = await client.post<unknown>(
          AUTH_BASE_PATH + '/login',
          { email: credentials.email, password: credentials.password },
          authRequestConfig(),
        );
        return parseAuthPayload(payload);
      } catch (error) {
        if (error instanceof AuthAdapterError) {
          throw error;
        }
        throw loginError(error);
      }
    },

    async register(data: RegistrationData): Promise<AuthSession> {
      try {
        const payload = await client.post<unknown>(
          AUTH_BASE_PATH + '/register',
          buildRegistrationPayload(data),
          authRequestConfig(),
        );
        return parseAuthPayload(payload);
      } catch (error) {
        if (error instanceof AuthAdapterError) {
          throw error;
        }
        throw registrationError();
      }
    },

    async logout(): Promise<void> {
      try {
        await client.post<unknown>(
          AUTH_BASE_PATH + '/logout',
          undefined,
          authRequestConfig(),
        );
      } catch {
        throw logoutError();
      }
    },
  };
}

/**
 * Deliberately unavailable test seam. Normal application builds select the
 * HTTP service below; this adapter is retained for focused isolated tests.
 */
export function createUnavailableAuthService(): AuthService {
  const unavailable = (): Promise<never> =>
    Promise.reject(
      new AuthAdapterError(
        'authentication_unavailable',
        'Authentication is not available yet. Please try again after backend integration is enabled.',
      ),
    );

  return {
    getSession: () => Promise.resolve(null),
    refreshSession: () => unavailable(),
    login: () => unavailable(),
    register: () => unavailable(),
    logout: () => Promise.resolve(),
  };
}

/**
 * Deterministic adapter used only by Playwright builds that explicitly set
 * NEXT_PUBLIC_AUTH_E2E_TEST_MODE=true. It is never selected by normal builds.
 */
export function createE2EAuthService(): AuthService {
  const storageKey = 'invora-e2e-auth-email';

  function createSession(email: string): AuthSession {
    return {
      accessToken: 'e2e-test-access-token',
      expiresAt: expiresAtFromNow(30 * 60),
      user: { id: 'e2e-user', email, fullName: null },
    };
  }

  function readEmail(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.sessionStorage.getItem(storageKey);
  }

  function writeEmail(email: string): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, email);
    }
  }

  function clearEmail(): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKey);
    }
  }

  return {
    getSession: () => {
      const email = readEmail();
      return Promise.resolve(email === null ? null : createSession(email));
    },
    refreshSession: () => {
      const email = readEmail();
      return email === null
        ? Promise.reject(sessionRecoveryError())
        : Promise.resolve(createSession(email));
    },
    login: (credentials) => {
      writeEmail(credentials.email);
      return Promise.resolve(createSession(credentials.email));
    },
    register: (data) => {
      writeEmail(data.email);
      return Promise.resolve(createSession(data.email));
    },
    logout: () => {
      clearEmail();
      return Promise.resolve();
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_AUTH_E2E_TEST_MODE === 'true';

/** The sole Auth adapter selected for the current browser build. */
export const authService: AuthService = isE2ETestMode
  ? createE2EAuthService()
  : createHttpAuthService();
