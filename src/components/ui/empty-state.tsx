import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Defaults to generic copy; features supply their own domain wording. */
  title?: string;
  description?: string;
  /** Optional call to action, e.g. a button that opens a create form. */
  action?: ReactNode;
  /** Decorative leading visual; hidden from assistive technology. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Shown when a request succeeded but returned nothing.
 *
 * Distinct from {@link ErrorState}: nothing failed, so no retry is offered.
 */
export function EmptyState({
  title = 'No data available.',
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed',
        'border-border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon === undefined ? null : (
        <span aria-hidden="true" className="text-foreground-muted">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description === undefined ? null : (
        <p className="max-w-prose text-sm text-foreground-muted">{description}</p>
      )}
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}
