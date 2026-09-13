import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { SalesTrendPoint } from '@/features/sales/types';

export interface SalesHistoryChartProps {
  readonly points: readonly SalesTrendPoint[];
  readonly isLoading?: boolean;
  readonly errorMessage?: string | undefined;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
}

function chartPolyline(points: readonly SalesTrendPoint[]): string {
  const largestValue = Math.max(...points.map((point) => point.totalQuantity), 1);
  const chartWidth = 560;
  const chartHeight = 180;
  const left = 20;
  const top = 18;
  const bottom = 24;
  const drawableWidth = chartWidth - left * 2;
  const drawableHeight = chartHeight - top - bottom;
  const divisor = Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = left + (drawableWidth * index) / divisor;
      const y =
        top + drawableHeight - (point.totalQuantity / largestValue) * drawableHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

/**
 * Lightweight SVG chart reusing the Dashboard chart approach. It projects the
 * backend's date-wise quantity aggregates and remains supplementary to the
 * accessible Sales History table.
 */
export function SalesHistoryChart({
  points,
  isLoading = false,
  errorMessage,
}: SalesHistoryChartProps) {
  const title = 'Sales quantity trend';
  const headingId = 'sales-quantity-trend-heading';

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <div
        role="status"
        aria-label="Loading sales quantity trend"
        className="space-y-3"
      >
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  } else if (errorMessage !== undefined) {
    content = (
      <ErrorState
        title={errorMessage}
        description="The sales table may still be available. Try again when the service is restored."
      />
    );
  } else if (points.length === 0) {
    content = (
      <EmptyState
        title="No sales data available for the selected period."
        description="Sales quantity trends will appear when transaction data is available."
        className="border-0 bg-surface-muted py-8"
      />
    );
  } else {
    const firstPoint = points.at(0);
    const lastPoint = points.at(-1);
    const totalQuantity = points.reduce(
      (total, point) => total + point.totalQuantity,
      0,
    );
    const summary = `${points.length} reporting periods, ${formatQuantity(totalQuantity)} total units sold from ${firstPoint?.periodStart ?? ''} to ${lastPoint?.periodStart ?? firstPoint?.periodStart ?? ''}.`;

    content = (
      <>
        <p className="mb-4 text-sm text-foreground-muted">
          Quantity sold by reporting period for the selected date range.
        </p>
        <svg
          role="img"
          aria-label={`${title}. ${summary}`}
          viewBox="0 0 560 180"
          preserveAspectRatio="none"
          className="h-52 w-full overflow-visible"
        >
          <line
            x1="20"
            x2="540"
            y1="156"
            y2="156"
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
          <polyline
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            points={chartPolyline(points)}
          />
        </svg>
        <div className="mt-2 flex justify-between gap-4 text-xs text-foreground-muted">
          <span>{firstPoint?.periodStart}</span>
          <span>{lastPoint?.periodStart ?? firstPoint?.periodStart}</span>
        </div>
        <p className="mt-3 text-sm text-foreground-muted">{summary}</p>
      </>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <CardTitle as="h2" id={headingId}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </section>
  );
}
