'use client';

import { QueryClientContext } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { AuthAdapterError, authService, type AuthService } from '@/features/auth/api';
import type {
  AuthError,
  AuthState,
  AuthStatus,
  LoginCredentials,
  RegistrationData,
} from '@/features/auth/types';
import { registerAuthRefreshHandler } from '@/lib/api-client';
import { clearProtectedQueryCache } from '@/lib/query-client';
import { useAuth as useAuthStore } from '@/hooks/use-auth';

export interface AuthContextValue extends AuthState {
  login(credentials: LoginCredentials): Promise<boolean>;
  register(data: RegistrationData): Promise<boolean>;
  logout(): Promise<void>;
  clearError(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /** Dependency-injection seam for isolated component tests and future adapters. */
  service?: AuthService;
}

function toAuthError(
  error: unknown,
  action: 'login' | 'register' | 'logout',
): AuthError {
  if (error instanceof AuthAdapterError) {
    return { code: error.code, message: error.message };
  }

  if (action === 'login') {
    return { code: 'invalid_credentials', message: 'Invalid email or password.' };
  }
  if (action === 'register') {
    return {
      code: 'registration_failed',
      message: 'We could not create your account. Please try again.',
    };
  }
  return {
    code: 'logout_failed',
    message:
      'We could not complete sign out with the server. Local session data was cleared.',
  };
}

/**
 * Application Auth boundary.
 *
 * The Foundation auth store remains the only session source. This provider
 * restores the memory-only access token through the HttpOnly refresh cookie,
 * registers the shared recovery coordinator, and clears only protected cache
 * entries when the local session is lost.
 */
export function AuthProvider({ children, service = authService }: AuthProviderProps) {
  const queryClient = useContext(QueryClientContext);
  const { status: storeStatus, user, setSession, signOut } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [pendingAction, setPendingAction] = useState<AuthState['pendingAction']>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const interactiveAuthAction = useRef(false);

  const clearAuthenticatedState = useCallback(() => {
    signOut();
    clearProtectedQueryCache(queryClient);
  }, [queryClient, signOut]);

  useEffect(() => {
    let active = true;

    const unregisterRefreshHandler = registerAuthRefreshHandler(async () => {
      try {
        const session = await service.refreshSession();
        if (active) {
          setSession(session);
        }
      } catch (caught) {
        if (active) {
          clearAuthenticatedState();
        }
        throw caught;
      }
    });

    void service
      .getSession()
      .then((session) => {
        if (!active) {
          return;
        }
        if (session === null) {
          // A user can submit login/register before initialization settles.
          // Do not let a stale unauthenticated recovery overwrite that fresh
          // in-memory session. A failed initial recovery still clears a stale
          // store when no interactive Auth action has begun.
          if (!interactiveAuthAction.current) {
            clearAuthenticatedState();
          }
          return;
        }
        setSession(session);
      })
      .catch(() => {
        if (active && !interactiveAuthAction.current) {
          clearAuthenticatedState();
        }
      })
      .finally(() => {
        if (active) {
          setInitialized(true);
        }
      });

    return () => {
      active = false;
      unregisterRefreshHandler();
    };
  }, [clearAuthenticatedState, service, setSession]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setPendingAction('login');
      setError(null);
      interactiveAuthAction.current = true;

      try {
        setSession(await service.login(credentials));
        return true;
      } catch (caught) {
        interactiveAuthAction.current = false;
        setError(toAuthError(caught, 'login'));
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [service, setSession],
  );

  const register = useCallback(
    async (data: RegistrationData): Promise<boolean> => {
      setPendingAction('register');
      setError(null);
      interactiveAuthAction.current = true;

      try {
        setSession(await service.register(data));
        return true;
      } catch (caught) {
        interactiveAuthAction.current = false;
        setError(toAuthError(caught, 'register'));
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [service, setSession],
  );

  const logout = useCallback(async (): Promise<void> => {
    setPendingAction('logout');
    setError(null);
    interactiveAuthAction.current = false;

    try {
      await service.logout();
    } catch (caught) {
      setError(toAuthError(caught, 'logout'));
      throw caught;
    } finally {
      clearAuthenticatedState();
      setPendingAction(null);
    }
  }, [clearAuthenticatedState, service]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const status: AuthStatus = initialized ? storeStatus : 'initializing';
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      pendingAction,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [clearError, error, login, logout, pendingAction, register, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Canonical Auth hook for feature and route components. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
