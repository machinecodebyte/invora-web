'use client';

import { useEffect } from 'react';

import { logger } from '@/lib/logger';

import './globals.css';

/**
 * Last-resort boundary for failures in the root layout itself.
 *
 * It replaces the whole document, so it must render its own `html`/`body` and
 * cannot rely on shared providers or the app shell.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('global_error_boundary', { digest: error.digest ?? null });
  }, [error.digest]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div
            role="alert"
            className="flex max-w-lg flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-12 text-center"
          >
            <p className="text-sm font-semibold text-danger">Something went wrong.</p>
            <p className="text-sm text-foreground-muted">
              The application could not be loaded. Please reload the page.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-1 inline-flex h-9 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
