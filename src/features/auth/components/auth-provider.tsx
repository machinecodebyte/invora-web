'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

function toAuthError(error: unknown, action: 'login' | 'register'): AuthError {
  if (error instanceof AuthAdapterError) {
    return { code: error.code, message: error.message };
  }

  return action === 'login'
    ? { code: 'invalid_credentials', message: 'Invalid email or password.' }
    : {
        code: 'registration_failed',
        message: 'We could not create your account. Please try again.',
      };
}

/**
 * Application Auth boundary.
 *
 * The Foundation `authStore` remains the only session source. This provider
 * adds initialization and action state around that store; it does not create a
 * second session or persist credentials.
 */
export function AuthProvider({ children, service = authService }: AuthProviderProps) {
  const { status: storeStatus, user, setSession, signOut } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [pendingAction, setPendingAction] = useState<AuthState['pendingAction']>(null);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    let active = true;

    void service
      .getSession()
      .then((session) => {
        if (active && session !== null) {
          setSession(session);
        }
      })
      .catch(() => {
        // Session restoration is deliberately silent: no production adapter is
        // connected yet, and the safe fallback is unauthenticated.
      })
      .finally(() => {
        if (active) {
          setInitialized(true);
        }
      });

    return () => {
      active = false;
    };
  }, [service, setSession]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setPendingAction('login');
      setError(null);

      try {
        setSession(await service.login(credentials));
        return true;
      } catch (caught) {
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

      try {
        // The backend's register response issues a token pair, so a successful
        // future adapter can establish the same session transition as login.
        setSession(await service.register(data));
        return true;
      } catch (caught) {
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
    signOut();

    try {
      // This is a local-only no-op until a backend adapter is introduced.
      await service.logout();
    } finally {
      setPendingAction(null);
    }
  }, [service, signOut]);

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
