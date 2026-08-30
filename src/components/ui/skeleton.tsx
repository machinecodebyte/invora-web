import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
}

/**
 * Placeholder block for content that is still loading.
 *
 * Purely decorative and hidden from assistive technology: screen readers should
 * hear the surrounding `role="status"` region, not a series of empty boxes.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-testid="skeleton"
      className={cn('block animate-pulse rounded-md bg-surface-muted', className)}
    />
  );
}
