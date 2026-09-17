import { Button } from '@/components/ui/button';
import { TableScrollArea } from '@/components/ui/table-scroll-area';
import { InventoryStatusBadge } from '@/features/inventory/components/inventory-status-badge';
import type { InventoryItem } from '@/features/inventory/types';

const quantityFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3,
});

function formatQuantity(value: number, unit: string): string {
  return quantityFormatter.format(value) + ' ' + unit;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export interface InventoryTableProps {
  items: readonly InventoryItem[];
  onUpdateStock: (item: InventoryItem) => void;
}

/** Semantic Inventory table with a contained horizontal overflow boundary. */
export function InventoryTable({ items, onUpdateStock }: InventoryTableProps) {
  return (
    <TableScrollArea className="rounded-lg border border-border bg-surface">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Inventory</caption>
        <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
          <tr>
            <th scope="col" className="w-[18%] px-4 py-3 font-medium">
              Product
            </th>
            <th scope="col" className="w-[12%] px-4 py-3 font-medium">
              SKU
            </th>
            <th scope="col" className="w-[13%] px-4 py-3 font-medium">
              Current stock
            </th>
            <th scope="col" className="w-[13%] px-4 py-3 font-medium">
              Minimum stock
            </th>
            <th scope="col" className="w-[13%] px-4 py-3 font-medium">
              Safety stock
            </th>
            <th scope="col" className="w-[12%] px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="w-[11%] px-4 py-3 font-medium">
              Updated
            </th>
            <th scope="col" className="w-[8%] px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="text-foreground">
              <td className="break-words px-4 py-3 font-medium">{item.product.name}</td>
              <td className="break-all px-4 py-3 font-mono text-xs">
                {item.product.sku}
              </td>
              <td className="px-4 py-3 font-medium">
                {formatQuantity(item.currentStock, item.product.unit)}
              </td>
              <td className="px-4 py-3">
                {formatQuantity(item.minimumStock, item.product.unit)}
              </td>
              <td className="px-4 py-3">
                {formatQuantity(item.safetyStock, item.product.unit)}
              </td>
              <td className="px-4 py-3">
                <InventoryStatusBadge status={item.stockStatus} />
              </td>
              <td className="px-4 py-3 text-foreground-muted">
                {formatUpdatedAt(item.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={'Update stock for ' + item.product.name}
                  onClick={() => onUpdateStock(item)}
                >
                  Update
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScrollArea>
  );
}
