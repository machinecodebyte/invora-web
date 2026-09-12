import { cn } from '@/lib/utils';
import type { InventoryStockStatus } from '@/features/inventory/types';

const STATUS_LABELS: Readonly<Record<InventoryStockStatus, string>> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  inactive: 'Inactive',
};

const STATUS_CLASSES: Readonly<Record<InventoryStockStatus, string>> = {
  in_stock: 'border-success/40 bg-success/10 text-success',
  low_stock: 'border-warning/40 bg-warning/10 text-warning',
  out_of_stock: 'border-danger/40 bg-danger/10 text-danger',
  inactive: 'border-border bg-surface-muted text-foreground-muted',
};

export interface InventoryStatusBadgeProps {
  status: InventoryStockStatus;
}

/** Readable inventory status treatment; text is never conveyed by color alone. */
export function InventoryStatusBadge({ status }: InventoryStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
