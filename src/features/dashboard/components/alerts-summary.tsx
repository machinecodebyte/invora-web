import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  DashboardReorderAlert,
  DashboardRiskLevel,
} from '@/features/dashboard/types';

export interface AlertsSummaryProps {
  alerts: readonly DashboardReorderAlert[];
}

const SEVERITY_CLASSES: Readonly<Record<DashboardRiskLevel, string>> = {
  low: 'bg-surface-muted text-foreground-muted',
  medium: 'bg-warning/15 text-warning',
  high: 'bg-danger/10 text-danger',
  critical: 'bg-danger text-danger-foreground',
  overstocked: 'bg-accent/15 text-accent',
};

function readableRiskLevel(riskLevel: DashboardRiskLevel): string {
  return `${riskLevel.charAt(0).toUpperCase()}${riskLevel.slice(1)} risk`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

/** Read-only summary of Dashboard Analytics reorder alerts; it never performs reorder actions. */
export function AlertsSummary({ alerts }: AlertsSummaryProps) {
  return (
    <section aria-labelledby="dashboard-alerts-heading">
      <Card className="h-full">
        <CardHeader>
          <CardTitle as="h2" id="dashboard-alerts-heading">
            Reorder alerts
          </CardTitle>
          <p className="text-sm text-foreground-muted">
            Open recommendations from the latest Dashboard Analytics summary.
          </p>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <EmptyState
              title="No alerts available."
              description="Open reorder alerts will appear here."
              className="border-0 bg-surface-muted py-8"
            />
          ) : (
            <ul className="divide-y divide-border" aria-label="Open reorder alerts">
              {alerts.map((alert) => (
                <li key={alert.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {alert.productName}
                      </p>
                      <p className="mt-1 text-sm text-foreground-muted">
                        SKU: {alert.sku}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_CLASSES[alert.riskLevel]}`}
                    >
                      {readableRiskLevel(alert.riskLevel)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground-muted">
                    Reorder quantity: {formatQuantity(alert.reorderQuantity)}
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
