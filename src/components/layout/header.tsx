import type { ReactNode } from 'react';

import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  /**
   * Navigation slot. Left empty by the foundation; the Dashboard and Auth
   * modules will supply the authenticated navigation and account menu.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * Application header with the Invora wordmark.
 *
 * Rendered as a `banner` landmark via the semantic `<header>` element.
 */
export function Header({ children, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur',
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
          >
            {APP_NAME.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{APP_NAME}</p>
            <p className="hidden truncate text-xs text-foreground-muted sm:block">
              {APP_TAGLINE}
            </p>
          </div>
        </div>
        {children === undefined ? null : (
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            {children}
          </nav>
        )}
      </div>
    </header>
  );
}
