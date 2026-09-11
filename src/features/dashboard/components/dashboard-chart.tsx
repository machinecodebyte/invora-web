import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardDemandTrendPoint } from '@/features/dashboard/types';

export interface DashboardChartProps {
  points: readonly DashboardDemandTrendPoint[];
  isLoading?: boolean;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function chartPolyline(points: readonly DashboardDemandTrendPoint[]): string {
  const largestValue = Math.max(...points.map((point) => point.totalQuantitySold), 1);
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
        top +
        drawableHeight -
        (point.totalQuantitySold / largestValue) * drawableHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

/**
 * Lightweight SVG demand chart. A chart dependency is intentionally avoided:
 * this static, responsive projection needs no interactive charting framework.
 */
export function DashboardChart({ points, isLoading = false }: DashboardChartProps) {
  const title = 'Demand trend';

  if (isLoading) {
    return (
      <section aria-labelledby="dashboard-demand-trend-heading">
        <Card>
          <CardHeader>
            <CardTitle as="h2" id="dashboard-demand-trend-heading">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              role="status"
              aria-label="Loading demand trend chart"
              className="space-y-3"
            >
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (points.length === 0) {
    return (
      <section aria-labelledby="dashboard-demand-trend-heading">
        <Card>
          <CardHeader>
            <CardTitle as="h2" id="dashboard-demand-trend-heading">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No demand trend data available."
              description="Demand trends will appear when sales data is available."
              className="border-0 bg-surface-muted py-8"
            />
          </CardContent>
        </Card>
      </section>
    );
  }

  const firstPoint = points.at(0);
  if (firstPoint === undefined) {
    return null;
  }
  const lastPoint = points.at(-1);
  const totalQuantity = points.reduce(
    (total, point) => total + point.totalQuantitySold,
    0,
  );
  const summary = `${points.length} periods, ${formatQuantity(totalQuantity)} total units sold from ${firstPoint.period} to ${lastPoint?.period ?? firstPoint.period}.`;

  return (
    <section aria-labelledby="dashboard-demand-trend-heading">
      <Card>
        <CardHeader>
          <CardTitle as="h2" id="dashboard-demand-trend-heading">
            {title}
          </CardTitle>
          <p className="text-sm text-foreground-muted">
            Sales quantity by reporting period.
          </p>
        </CardHeader>
        <CardContent>
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
            <span>{firstPoint.period}</span>
            <span>{lastPoint?.period ?? firstPoint.period}</span>
          </div>
          <p className="mt-3 text-sm text-foreground-muted">{summary}</p>
        </CardContent>
      </Card>
    </section>
  );
}
