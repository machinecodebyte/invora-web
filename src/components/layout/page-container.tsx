import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageContainerProps {
  /** Rendered as the page's `h1` when provided. */
  title?: string;
  description?: string;
  /** Page-level actions aligned opposite the title. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Width-constrained page wrapper with a consistent heading block.
 *
 * Owning the `h1` here keeps every page to exactly one top-level heading and a
 * predictable document outline.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  const hasHeading =
    title !== undefined || description !== undefined || actions !== undefined;

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8',
        className,
      )}
    >
      {hasHeading ? (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title === undefined ? null : (
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
            )}
            {description === undefined ? null : (
              <p className="mt-2 max-w-2xl text-sm text-foreground-muted sm:text-base">
                {description}
              </p>
            )}
          </div>
          {actions === undefined ? null : (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      ) : null}
      {children}
    </div>
  );
}
