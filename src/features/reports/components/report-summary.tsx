import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber } from '@/lib/utils';
import type { ReportSummaryMetric, ReportValue } from '@/features/reports/types';

function formatValue(value: ReportValue, format: ReportSummaryMetric['format']): string {
  if (value === null) {
    return '—';
  }
  if (typeof value === 'string') {
    return format === 'date' ? formatDate(value, { dateStyle: 'medium', timeZone: 'UTC' }) : value;
  }
  if (format === 'currency') {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (format === 'percentage') {
    return `${formatNumber(value, { maximumFractionDigits: 2 })}%`;
  }
  return formatNumber(value, { maximumFractionDigits: 3 });
}

export interface ReportSummaryProps {
  readonly metrics: readonly ReportSummaryMetric[];
}

/** Displays values returned by the selected report; it never computes metrics. */
export function ReportSummary({ metrics }: ReportSummaryProps) {
  if (metrics.length === 0) {
    return null;
  }
  return (
    <section aria-label="Report summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardTitle as="h2" className="text-sm font-medium text-foreground-muted">
              {metric.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatValue(metric.value, metric.format)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
