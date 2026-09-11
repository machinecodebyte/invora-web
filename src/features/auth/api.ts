import { expiresAtFromNow, type AuthSession } from '@/lib/auth';
import type { LoginCredentials, RegistrationData } from '@/features/auth/types';

export type AuthAdapterErrorCode =
  'authentication_unavailable' | 'invalid_credentials' | 'registration_failed';

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

/** Future HTTP integration implements this contract without changing UI or state flows. */
export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(data: RegistrationData): Promise<AuthSession>;
  logout(): Promise<void>;
}

/**
 * Default adapter while backend integration is intentionally deferred.
 *
 * It performs no fetches and deliberately cannot authenticate a production
 * user. Local logout remains available because clearing in-memory UI state is
 * useful even before server-side session revocation is wired up.
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
    login: () => unavailable(),
    register: () => unavailable(),
    logout: () => Promise.resolve(),
  };
}

/**
 * Deterministic adapter used only by Playwright builds that explicitly set
 * `NEXT_PUBLIC_AUTH_E2E_TEST_MODE=true`. It holds no database, persists no
 * identity, and is never selected by the normal application build.
 */
export function createE2EAuthService(): AuthService {
  const storageKey = 'invora-e2e-auth-email';

  function createSession(email: string): AuthSession {
    return {
      // Test-only transport placeholder; `useAuth` never exposes it to the UI.
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

/** The sole adapter selected for the current build. */
export const authService: AuthService = isE2ETestMode
  ? createE2EAuthService()
  : createUnavailableAuthService();
