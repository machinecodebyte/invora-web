import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClassName } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ROUTES } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Page not found',
};

/** Rendered for unmatched routes and explicit `notFound()` calls. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl">
        <EmptyState
          title="Page not found."
          description="The page you requested does not exist or may have been moved."
          action={
            <Link
              href={ROUTES.home}
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Return home
            </Link>
          }
        />
      </div>
    </main>
  );
}
