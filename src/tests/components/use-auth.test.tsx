import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useAuth } from '@/hooks/use-auth';
import { authStore, expiresAtFromNow, type AuthSession } from '@/lib/auth';

function session(): AuthSession {
  return {
    accessToken: 'access-token',
    expiresAt: expiresAtFromNow(1800),
    user: { id: 'user-1', email: 'user@example.com', fullName: 'Test User' },
  };
}

/** Harness exercising the hook's public surface. */
function AuthProbe() {
  const { status, isAuthenticated, user, setSession, signOut } = useAuth();

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="email">{user?.email ?? 'none'}</p>
      <button type="button" onClick={() => setSession(session())}>
        Sign in
      </button>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

afterEach(() => {
  // The shared store is module-level; a leftover session would leak between tests.
  authStore.clearSession();
});

describe('useAuth', () => {
  it('reports an unauthenticated state before any session exists', () => {
    render(<AuthProbe />);

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('re-renders with the authenticated user after a session is set', async () => {
    render(<AuthProbe />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('email')).toHaveTextContent('user@example.com');
  });

  it('clears the state on sign-out', async () => {
    render(<AuthProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('does not expose the access token to the render tree', async () => {
    render(<AuthProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    // The token must reach outgoing requests only, never rendered markup.
    expect(document.body.textContent).not.toContain('access-token');
  });

  it('propagates external store updates to mounted consumers', () => {
    render(<AuthProbe />);

    // Wrapped in act because the update originates outside React's event system.
    act(() => {
      authStore.setSession(session());
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });
});
