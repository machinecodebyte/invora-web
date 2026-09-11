import Link from 'next/link';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/lib/constants';

export interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Focused public layout shared by the login and registration routes. */
export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <Link
          href={ROUTES.home}
          className="mb-8 flex items-center justify-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${APP_NAME} home`}
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground"
          >
            {APP_NAME.charAt(0)}
          </span>
          <span className="text-left">
            <span className="block text-base font-semibold text-foreground">
              {APP_NAME}
            </span>
            <span className="block text-xs text-foreground-muted">{APP_TAGLINE}</span>
          </span>
        </Link>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-foreground-muted">{description}</p>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
