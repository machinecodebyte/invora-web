/**
 * Authentication infrastructure for the frontend.
 *
 * SCOPE: this is foundation-only plumbing. It holds session state and hands the
 * access token to the API client. It performs no network calls and knows no
 * auth endpoints - login, registration, refresh, and logout requests belong to
 * the Auth feature module (src/features/auth), which drives this store.
 *
 * SECURITY: sessions live in memory by default, so tokens are never written to
 * `localStorage` or `sessionStorage` by the foundation and cannot be read by
 * injected scripts or survive a tab reload. The backend refresh token is an
 * HttpOnly cookie and is never represented in this store or application state.
 * Reload recovery is performed by the Auth feature through the cookie-only
 * refresh endpoint, then this store receives the new memory-only access token.
 */

/** Minimal identity fields shared across the app. The Auth module owns the full profile. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

/** An authenticated session held by the client. */
export interface AuthSession {
  accessToken: string;
  /** Absolute expiry as epoch milliseconds, or `null` when unknown. */
  expiresAt: number | null;
  user: AuthUser | null;
}

export type AuthStatus = 'authenticated' | 'unauthenticated';

/** Snapshot consumed by React through `useAuth`. */
export interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
}

/** Immutable snapshot used before any session exists, including during SSR. */
export const UNAUTHENTICATED_STATE: AuthState = Object.freeze({
  status: 'unauthenticated',
  session: null,
});

/**
 * Pluggable session persistence.
 *
 * The foundation ships an in-memory implementation only. A future Auth module
 * may supply a different adapter once the storage policy is settled.
 */
export interface AuthSessionStorage {
  read(): AuthSession | null;
  write(session: AuthSession): void;
  clear(): void;
}

/** Non-persistent storage: state is lost on reload, which is the safe default. */
export function createMemorySessionStorage(): AuthSessionStorage {
  let current: AuthSession | null = null;

  return {
    read: () => current,
    write: (session) => {
      current = session;
    },
    clear: () => {
      current = null;
    },
  };
}

/** Convert the backend's `expires_in` (seconds) into an absolute epoch timestamp. */
export function expiresAtFromNow(
  expiresInSeconds: number,
  now: number = Date.now(),
): number {
  return now + expiresInSeconds * 1000;
}

/** True when the session carries a known expiry that has already passed. */
export function isSessionExpired(
  session: AuthSession | null,
  now: number = Date.now(),
): boolean {
  if (session === null) {
    return true;
  }
  if (session.expiresAt === null) {
    return false;
  }
  return session.expiresAt <= now;
}

export interface AuthStore {
  /** Current snapshot. Reference-stable between mutations, as `useSyncExternalStore` requires. */
  getState(): AuthState;
  /** Subscribe to state changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Replace the active session (called by the Auth module after a successful sign-in). */
  setSession(session: AuthSession): void;
  /** Drop all local session state. */
  clearSession(): void;
  /** Bearer token for outgoing requests, or `null` when absent or expired. */
  getAccessToken(): string | null;
  /** True when a non-expired session exists. */
  isAuthenticated(): boolean;
}

export interface CreateAuthStoreOptions {
  storage?: AuthSessionStorage;
}

/**
 * Create an isolated auth store.
 *
 * Exposed as a factory so tests (and future server-side usage) can work with an
 * independent instance instead of the shared module-level store.
 */
export function createAuthStore(options: CreateAuthStoreOptions = {}): AuthStore {
  const storage = options.storage ?? createMemorySessionStorage();
  const listeners = new Set<() => void>();
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  const initialSession = storage.read();
  let state: AuthState = buildState(initialSession);

  if (initialSession !== null && state === UNAUTHENTICATED_STATE) {
    storage.clear();
  }

  function buildState(session: AuthSession | null): AuthState {
    if (session === null || isSessionExpired(session)) {
      return UNAUTHENTICATED_STATE;
    }
    return { status: 'authenticated', session };
  }

  function clearExpiryTimer(): void {
    if (expiryTimer !== undefined) {
      clearTimeout(expiryTimer);
      expiryTimer = undefined;
    }
  }

  /** Clear an expired session without retaining stale identity data in memory. */
  function expireSessionIfNeeded(): boolean {
    if (state.status !== 'authenticated' || !isSessionExpired(state.session)) {
      return false;
    }

    clearExpiryTimer();
    storage.clear();
    state = UNAUTHENTICATED_STATE;
    return true;
  }

  /**
   * Active `useAuth` subscribers must be notified when a token reaches its
   * expiry, otherwise UI state can remain authenticated after API calls stop
   * sending the token. Timers are held only while there are subscribers, so
   * isolated stores used by server code or tests do not retain event-loop work.
   */
  function scheduleExpiry(): void {
    clearExpiryTimer();

    const session = state.session;

    if (
      listeners.size === 0 ||
      state.status !== 'authenticated' ||
      session === null ||
      session.expiresAt === null
    ) {
      return;
    }

    const delay = Math.max(0, session.expiresAt - Date.now());
    expiryTimer = setTimeout(
      () => {
        expiryTimer = undefined;
        if (expireSessionIfNeeded()) {
          emit();
          return;
        }
        // A platform timer is capped at a signed 32-bit delay. Reschedule if a
        // long-lived session has not reached its expiry yet.
        scheduleExpiry();
      },
      Math.min(delay, 2_147_483_647),
    );
  }

  function getCurrentState(): AuthState {
    expireSessionIfNeeded();
    return state;
  }

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getState: getCurrentState,
    subscribe: (listener) => {
      listeners.add(listener);
      scheduleExpiry();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          clearExpiryTimer();
        }
      };
    },
    setSession: (session) => {
      state = buildState(session);
      if (state.status === 'authenticated') {
        storage.write(session);
      } else {
        storage.clear();
      }
      scheduleExpiry();
      emit();
    },
    clearSession: () => {
      clearExpiryTimer();
      storage.clear();
      state = UNAUTHENTICATED_STATE;
      emit();
    },
    getAccessToken: () => {
      const { session } = getCurrentState();
      if (session === null) {
        return null;
      }
      return session.accessToken;
    },
    isAuthenticated: () => getCurrentState().status === 'authenticated',
  };
}

/**
 * Shared client-side auth store.
 *
 * Client-only by design: module state on the server is shared across requests,
 * so server components must never write to this store. `useAuth` reports an
 * unauthenticated snapshot during SSR for that reason.
 */
export const authStore = createAuthStore();

/** Bearer token for the shared store; consumed by the API client. */
export function getAccessToken(): string | null {
  return authStore.getAccessToken();
}

/** True when the shared store holds a valid session. */
export function isAuthenticated(): boolean {
  return authStore.isAuthenticated();
}
