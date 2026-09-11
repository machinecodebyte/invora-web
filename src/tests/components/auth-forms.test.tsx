import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthAdapterError, type AuthService } from '@/features/auth/api';
import { AuthProvider } from '@/features/auth/components/auth-provider';
import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';
import { authStore, expiresAtFromNow, type AuthSession } from '@/lib/auth';

const routerReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

const SESSION: AuthSession = {
  accessToken: 'test-access-token',
  expiresAt: expiresAtFromNow(1800),
  user: { id: 'test-user', email: 'test@example.com', fullName: null },
};

function createService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    getSession: () => Promise.resolve(null),
    login: () => Promise.resolve(SESSION),
    register: () => Promise.resolve(SESSION),
    logout: () => Promise.resolve(),
    ...overrides,
  };
}

afterEach(() => {
  authStore.clearSession();
  routerReplace.mockReset();
});

describe('LoginForm', () => {
  it('renders accessible fields and blocks invalid submission', async () => {
    const login = vi.fn();
    render(
      <AuthProvider service={createService({ login })}>
        <LoginForm redirectTo="/dashboard" />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeVisible();
    expect(screen.getByText('Password is required.')).toBeVisible();
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });

  it('normalizes credentials and redirects after successful login', async () => {
    const login = vi.fn(() => Promise.resolve(SESSION));
    render(
      <AuthProvider service={createService({ login })}>
        <LoginForm redirectTo="/dashboard" />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByLabelText(/^Email/), ' Test@Example.COM ');
    await userEvent.type(screen.getByLabelText(/^Password/), 'StrongPass1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass1!',
      });
      expect(routerReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('disables repeated submission while login is pending', async () => {
    let resolveLogin: (session: AuthSession) => void = () => undefined;
    const login = vi.fn(
      () =>
        new Promise<AuthSession>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    render(
      <AuthProvider service={createService({ login })}>
        <LoginForm redirectTo="/dashboard" />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByLabelText(/^Email/), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'StrongPass1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: /Sign in/ })).toBeDisabled();
    expect(login).toHaveBeenCalledTimes(1);

    resolveLogin(SESSION);
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows only a safe adapter error', async () => {
    render(
      <AuthProvider
        service={createService({
          login: () =>
            Promise.reject(
              new AuthAdapterError('invalid_credentials', 'Invalid email or password.'),
            ),
        })}
      >
        <LoginForm redirectTo="/dashboard" />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByLabelText(/^Email/), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'StrongPass1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password.',
    );
  });
});

describe('RegisterForm', () => {
  it('validates confirmation and backend-compatible password policy', async () => {
    const register = vi.fn();
    render(
      <AuthProvider service={createService({ register })}>
        <RegisterForm redirectTo="/dashboard" />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByLabelText(/^Email/), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'weak');
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Password must be at least 8 characters.'),
    ).toBeVisible();
    expect(screen.getByText('Passwords do not match.')).toBeVisible();
    expect(register).not.toHaveBeenCalled();
  });

  it('omits confirmation from the adapter data and redirects after registration', async () => {
    const register = vi.fn(() => Promise.resolve(SESSION));
    render(
      <AuthProvider service={createService({ register })}>
        <RegisterForm redirectTo="/dashboard" />
      </AuthProvider>,
    );

    await userEvent.type(screen.getByLabelText(/^Email/), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'StrongPass1!');
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'StrongPass1!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass1!',
      });
      expect(routerReplace).toHaveBeenCalledWith('/dashboard');
    });
  });
});
