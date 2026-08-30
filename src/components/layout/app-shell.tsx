import type { ReactNode } from 'react';

import { Header } from '@/components/layout/header';
import { MainContent } from '@/components/layout/main-content';
import { Toaster } from '@/components/ui/toaster';
import { APP_NAME, MAIN_CONTENT_ELEMENT_ID } from '@/lib/constants';

export interface AppShellProps {
  children: ReactNode;
  /** Navigation passed through to the header; supplied by future modules. */
  navigation?: ReactNode;
}

/**
 * Outer application chrome: skip link, header, main landmark, footer, and the
 * toast outlet.
 *
 * Composed by pages rather than by the root layout, so future route groups (for
 * example unauthenticated auth screens) can opt out of the app chrome entirely.
 */
export function AppShell({ children, navigation }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href={`#${MAIN_CONTENT_ELEMENT_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Header>{navigation}</Header>
      <MainContent>{children}</MainContent>
      <footer className="border-t border-border py-6">
        <div className="mx-auto w-full max-w-7xl px-4 text-xs text-foreground-muted sm:px-6 lg:px-8">
          {APP_NAME}
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
