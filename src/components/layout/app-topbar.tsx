'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAppRouteContext } from '@/components/layout/app-navigation';
import { Icon } from '@/components/ui/icon';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { useAuth } from '@/features/auth/hooks';
import { ROUTES } from '@/lib/constants';

export interface AppTopbarProps {
  onOpenNavigation: () => void;
  actions?: ReactNode;
}

function getInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || 'I';
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return initials === '' ? 'I' : initials;
}

/** Persistent authenticated page context, account actions, and mobile-nav trigger. */
export function AppTopbar({ onOpenNavigation, actions }: AppTopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const context = getAppRouteContext(pathname);
  const initials = getInitials(user?.fullName ?? null, user?.email ?? null);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenNavigation}
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Open application navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground-muted">
              {context.section}
            </p>
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">
              {context.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {actions}
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 text-left hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              >
                {initials}
              </span>
              <span className="hidden max-w-44 min-w-0 sm:block">
                <span className="block truncate text-sm font-medium text-foreground">
                  {user?.fullName?.trim() || 'Your account'}
                </span>
                <span className="block truncate text-xs text-foreground-muted">
                  {user?.email ?? 'Authenticated workspace'}
                </span>
              </span>
              <span className="sr-only">Open account menu</span>
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <div className="border-b border-border px-3 py-2.5 sm:hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.fullName?.trim() || 'Your account'}
                </p>
                <p className="truncate text-xs text-foreground-muted">
                  {user?.email ?? 'Authenticated workspace'}
                </p>
              </div>
              <Link
                href={ROUTES.settings}
                className="mt-1 flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                <Icon name="settings" className="size-4 text-foreground-muted" />
                Settings
              </Link>
              <div className="mt-1 border-t border-border pt-1">
                <LogoutButton />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
