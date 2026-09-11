import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { DashboardInventoryRiskItem } from '@/features/dashboard/types';

export interface HighRiskSummaryProps {
  items: readonly DashboardInventoryRiskItem[];
}

function readableStockStatus(
  status: DashboardInventoryRiskItem['stockStatus'],
): string {
  return status
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

/** Read-only inventory-risk projection; detail and remediation belong to later modules. */
export function HighRiskSummary({ items }: HighRiskSummaryProps) {
  return (
    <section aria-labelledby="dashboard-risk-heading">
      <Card className="h-full">
        <CardHeader>
          <CardTitle as="h2" id="dashboard-risk-heading">
            High-risk inventory
          </CardTitle>
          <p className="text-sm text-foreground-muted">
            Low-stock and out-of-stock inventory from Dashboard Analytics.
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              title="No high-risk items available."
              description="Inventory risk items will appear here when they need attention."
              className="border-0 bg-surface-muted py-8"
            />
          ) : (
            <ul
              className="divide-y divide-border"
              aria-label="High-risk inventory items"
            >
              {items.map((item) => (
                <li key={item.productId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-sm text-foreground-muted">
                        SKU: {item.sku}
                      </p>
                    </div>
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                      {readableStockStatus(item.stockStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground-muted">
                    Current stock: {formatQuantity(item.currentStock)} / minimum:{' '}
                    {formatQuantity(item.minimumStock)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
