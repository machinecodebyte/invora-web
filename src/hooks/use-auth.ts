'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  authStore,
  UNAUTHENTICATED_STATE,
  type AuthSession,
  type AuthStatus,
  type AuthUser,
} from '@/lib/auth';

export interface UseAuthResult {
  status: AuthStatus;
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Replace the active session; called by the Auth module after sign-in. */
  setSession: (session: AuthSession) => void;
  /** Clear local session state. Revoking the refresh token server-side is the Auth module's job. */
  signOut: () => void;
}

/**
 * Read the shared auth store from React.
 *
 * The access token is deliberately not returned: it would then flow through
 * render trees, props, and error reports. Outgoing requests get it from the
 * store directly via the API client.
 *
 * During SSR an unauthenticated snapshot is reported, because module-level
 * state is shared across server requests and must not be treated as a session.
 */
export function useAuth(): UseAuthResult {
  const state = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    () => UNAUTHENTICATED_STATE,
  );

  const setSession = useCallback((session: AuthSession) => {
    authStore.setSession(session);
  }, []);

  const signOut = useCallback(() => {
    authStore.clearSession();
  }, []);

  return {
    status: state.status,
    session: state.session,
    user: state.session?.user ?? null,
    isAuthenticated: state.status === 'authenticated',
    setSession,
    signOut,
  };
}
