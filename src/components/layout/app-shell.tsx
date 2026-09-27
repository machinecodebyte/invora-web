'use client';

import { useState, type ReactNode } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { MainContent } from '@/components/layout/main-content';
import { MobileNavigation } from '@/components/layout/mobile-navigation';
import { Toaster } from '@/components/ui/toaster';
import { APP_NAME, MAIN_CONTENT_ELEMENT_ID } from '@/lib/constants';

export interface AppShellProps {
  children: ReactNode;
  /** Optional contextual actions rendered before the account menu. */
  navigation?: ReactNode;
}

/**
 * Authenticated application chrome. Pages retain their feature content and
 * compose this shell, while public marketing and Auth routes remain separate.
 */
export function AppShell({ children, navigation }: AppShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href={`#${MAIN_CONTENT_ELEMENT_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <div className="flex min-h-dvh">
        <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            onOpenNavigation={() => {
              setMobileNavigationOpen(true);
            }}
            actions={navigation}
          />
          <MainContent className="flex flex-1 flex-col">{children}</MainContent>
          <footer className="border-t border-border px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-xs text-foreground-muted">
              {APP_NAME} <span aria-hidden="true">·</span> Inventory intelligence
            </p>
          </footer>
        </div>
      </div>
      <MobileNavigation
        open={mobileNavigationOpen}
        onClose={() => {
          setMobileNavigationOpen(false);
        }}
      />
      <Toaster />
    </div>
  );
}
