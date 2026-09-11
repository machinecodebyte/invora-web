'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks';
import { ROUTES } from '@/lib/constants';

/** Clears local Auth state and returns the user to the public login route. */
export function LogoutButton() {
  const router = useRouter();
  const { logout, pendingAction } = useAuth();
  const isPending = pendingAction === 'logout';

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace(ROUTES.login);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      isLoading={isPending}
      loadingLabel="Signing out"
      onClick={handleLogout}
    >
      Sign out
    </Button>
  );
}
