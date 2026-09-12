import type { ProductStatus } from '@/features/products/types';
import { cn } from '@/lib/utils';

export interface ProductStatusBadgeProps {
  status: ProductStatus;
}

/** Textual status so state is never communicated by color alone. */
export function ProductStatusBadge({ status }: ProductStatusBadgeProps) {
  const isActive = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        isActive
          ? 'bg-success/10 text-success'
          : 'bg-surface-muted text-foreground-muted',
      )}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
