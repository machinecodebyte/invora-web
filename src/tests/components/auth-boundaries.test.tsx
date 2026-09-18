import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthService } from '@/features/auth/api';
import { AuthProvider } from '@/features/auth/components/auth-provider';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { authStore, expiresAtFromNow, type AuthSession } from '@/lib/auth';

const routerReplace = vi.fn();
let pathname = '/dashboard';
let search = '';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: routerReplace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const SESSION: AuthSession = {
  accessToken: 'test-access-token',
  expiresAt: expiresAtFromNow(1800),
  user: { id: 'test-user', email: 'test@example.com', fullName: null },
};

const service: AuthService = {
  getSession: () => Promise.resolve(null),
  refreshSession: () => Promise.resolve(SESSION),
  login: () => Promise.resolve(SESSION),
  register: () => Promise.resolve(SESSION),
  logout: () => Promise.resolve(),
};

afterEach(() => {
  authStore.clearSession();
  routerReplace.mockReset();
  pathname = '/dashboard';
  search = '';
});

describe('ProtectedRoute', () => {
  it('redirects unauthenticated visitors to login with a local return path', async () => {
    pathname = '/dashboard';
    search = 'view=overview';
    render(
      <AuthProvider service={service}>
        <ProtectedRoute>
          <p>Protected content</p>
        </ProtectedRoute>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith(
        '/login?redirect=%2Fdashboard%3Fview%3Doverview',
      );
    });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders protected content for an authenticated session', async () => {
    authStore.setSession(SESSION);
    render(
      <AuthProvider
        service={{ ...service, getSession: () => Promise.resolve(SESSION) }}
      >
        <ProtectedRoute>
          <p>Protected content</p>
        </ProtectedRoute>
      </AuthProvider>,
    );

    expect(await screen.findByText('Protected content')).toBeVisible();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe('LogoutButton', () => {
  it('clears the shared session and navigates to login', async () => {
    authStore.setSession(SESSION);
    render(
      <AuthProvider service={service}>
        <LogoutButton />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(authStore.isAuthenticated()).toBe(false);
      expect(routerReplace).toHaveBeenCalledWith('/login');
    });
  });
});
