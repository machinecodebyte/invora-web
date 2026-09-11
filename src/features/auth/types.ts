import type { AuthUser } from '@/lib/auth';

/** Application-facing Auth state. `initializing` is resolved by AuthProvider. */
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

/** Safe credentials submitted by the login UI. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Backend-compatible registration input. `fullName` remains optional. */
export interface RegistrationData extends LoginCredentials {
  fullName?: string;
}

/** The operation currently interacting with the Auth adapter, if any. */
export type PendingAuthAction = 'login' | 'register' | 'logout' | null;

/** Display-safe Auth failure; never expose raw adapter or backend details. */
export interface AuthError {
  code:
    | 'authentication_unavailable'
    | 'invalid_credentials'
    | 'registration_failed'
    | 'unexpected';
  message: string;
}

/** Safe context state rendered by the application. */
export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  pendingAction: PendingAuthAction;
  error: AuthError | null;
}

export type { AuthUser };
