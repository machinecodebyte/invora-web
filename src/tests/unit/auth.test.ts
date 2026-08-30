import { describe, expect, it, vi } from 'vitest';

import {
  createAuthStore,
  createMemorySessionStorage,
  expiresAtFromNow,
  isSessionExpired,
  type AuthSession,
  type AuthSessionStorage,
} from '@/lib/auth';

/** Fixed instant for the pure helpers, which accept `now` explicitly. */
const NOW = 1_800_000_000_000;

/**
 * Store tests use real time with a wide margin instead of fake timers: the
 * store reads `Date.now()` internally, and a one-minute window is unambiguous.
 */
const ONE_MINUTE_MS = 60_000;

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-token',
    expiresAt: Date.now() + ONE_MINUTE_MS,
    user: { id: 'user-1', email: 'user@example.com', fullName: 'Test User' },
    ...overrides,
  };
}

describe('expiresAtFromNow', () => {
  it('converts the backend expires_in seconds into an absolute timestamp', () => {
    expect(expiresAtFromNow(1800, NOW)).toBe(NOW + 1_800_000);
  });
});

describe('isSessionExpired', () => {
  it('treats an absent session as expired', () => {
    expect(isSessionExpired(null, NOW)).toBe(true);
  });

  it('treats an unknown expiry as not expired', () => {
    expect(isSessionExpired(session({ expiresAt: null }), NOW)).toBe(false);
  });

  it('reports a future expiry as valid', () => {
    expect(isSessionExpired(session({ expiresAt: NOW + 1 }), NOW)).toBe(false);
  });

  it('reports a past expiry as expired', () => {
    expect(isSessionExpired(session({ expiresAt: NOW - 1 }), NOW)).toBe(true);
  });

  it('treats the exact expiry instant as expired', () => {
    expect(isSessionExpired(session({ expiresAt: NOW }), NOW)).toBe(true);
  });
});

describe('createMemorySessionStorage', () => {
  it('round-trips and clears a session without touching web storage', () => {
    const storage = createMemorySessionStorage();
    expect(storage.read()).toBeNull();

    storage.write(session());
    expect(storage.read()?.accessToken).toBe('access-token');

    storage.clear();
    expect(storage.read()).toBeNull();
  });
});

describe('createAuthStore', () => {
  it('starts unauthenticated', () => {
    const store = createAuthStore();

    expect(store.getState()).toEqual({ status: 'unauthenticated', session: null });
    expect(store.isAuthenticated()).toBe(false);
    expect(store.getAccessToken()).toBeNull();
  });

  it('exposes the session and token after sign-in', () => {
    const store = createAuthStore();

    store.setSession(session());

    expect(store.getState().status).toBe('authenticated');
    expect(store.getState().session?.user?.email).toBe('user@example.com');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.getAccessToken()).toBe('access-token');
  });

  it('clears all session state on sign-out', () => {
    const store = createAuthStore();
    store.setSession(session());

    store.clearSession();

    expect(store.getState()).toEqual({ status: 'unauthenticated', session: null });
    expect(store.getAccessToken()).toBeNull();
  });

  it('withholds expired sessions and invalidates active subscribers at expiry', () => {
    const store = createAuthStore();

    store.setSession(session({ expiresAt: Date.now() - ONE_MINUTE_MS }));

    expect(store.getState().status).toBe('unauthenticated');
    expect(store.getState().session).toBeNull();
    expect(store.getAccessToken()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);

    vi.useFakeTimers();
    try {
      const now = Date.now();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store.setSession(session({ expiresAt: now + 1_000 }));
      vi.advanceTimersByTime(1_000);

      expect(store.getState()).toEqual({ status: 'unauthenticated', session: null });
      expect(store.getAccessToken()).toBeNull();
      expect(store.isAuthenticated()).toBe(false);
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a session with no known expiry active', () => {
    const store = createAuthStore();

    store.setSession(session({ expiresAt: null }));

    expect(store.isAuthenticated()).toBe(true);
    expect(store.getAccessToken()).toBe('access-token');
  });

  it('notifies subscribers on set and clear', () => {
    const store = createAuthStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setSession(session());
    store.clearSession();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createAuthStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setSession(session());

    expect(listener).not.toHaveBeenCalled();
  });

  it('returns a reference-stable snapshot between mutations', () => {
    const store = createAuthStore();
    store.setSession(session());

    // useSyncExternalStore re-renders forever if the snapshot identity changes
    // on every read.
    expect(store.getState()).toBe(store.getState());
  });

  it('hydrates from injected storage so the Auth module can supply persistence', () => {
    const storage = createMemorySessionStorage();
    storage.write(session());

    const store = createAuthStore({ storage });

    expect(store.getState().status).toBe('authenticated');
    expect(store.getAccessToken()).toBe('access-token');
  });

  it('writes through to injected storage on set and clear', () => {
    const writes: AuthSession[] = [];
    let cleared = 0;
    const storage: AuthSessionStorage = {
      read: () => null,
      write: (value) => writes.push(value),
      clear: () => {
        cleared += 1;
      },
    };
    const store = createAuthStore({ storage });

    store.setSession(session());
    store.clearSession();

    expect(writes).toHaveLength(1);
    expect(cleared).toBe(1);
  });

  it('keeps instances isolated from each other', () => {
    const first = createAuthStore();
    const second = createAuthStore();

    first.setSession(session());

    expect(second.isAuthenticated()).toBe(false);
  });
});
