import type { Metadata, Viewport } from 'next';

import { AppProviders } from '@/app/providers';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/lib/constants';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // The app is an authenticated internal tool; keep it out of search indexes.
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximum-scale or user-scalable=no: pinch zoom must stay available.
  colorScheme: 'light dark',
};

/**
 * Root layout.
 *
 * Deliberately minimal - it owns the document shell and global providers only.
 * Visual chrome lives in `AppShell`, which pages compose, so future route
 * groups (such as unauthenticated auth screens) can render without it.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
