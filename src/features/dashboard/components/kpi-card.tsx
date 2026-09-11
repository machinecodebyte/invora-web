import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardKpi } from '@/features/dashboard/types';

export interface KpiCardProps {
  kpi: DashboardKpi;
}

function formatValue(value: number | null, format: DashboardKpi['format']): string {
  if (value === null) {
    return '—';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: format === 'percentage' ? 1 : 0,
  }).format(value);
  return format === 'percentage' ? `${formatted}%` : formatted;
}

/** A reusable, data-driven KPI card with an honest unavailable placeholder. */
export function KpiCard({ kpi }: KpiCardProps) {
  const value = formatValue(kpi.value, kpi.format);

  return (
    <Card role="article" aria-label={kpi.label}>
      <CardHeader>
        <CardTitle as="h3" className="text-sm font-medium text-foreground-muted">
          {kpi.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          aria-label={`${kpi.label}: ${value}`}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {value}
        </p>
        <p className="mt-2 text-sm text-foreground-muted">{kpi.description}</p>
      </CardContent>
    </Card>
  );
}
