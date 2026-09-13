import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatForecastPercentage,
  formatForecastValue,
} from '@/features/forecasting/components/forecast-results-formatters';
import type { ForecastResultMetrics } from '@/features/forecasting/types';

export interface ForecastMetricsProps {
  readonly metrics: ForecastResultMetrics | null;
}

/** Only backend-produced MAE, RMSE, and MAPE are represented as evaluation metrics. */
export function ForecastMetrics({ metrics }: ForecastMetricsProps) {
  if (metrics === null) {
    return (
      <Card aria-labelledby="forecast-metrics-heading">
        <CardHeader>
          <CardTitle as="h2" id="forecast-metrics-heading">Evaluation metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground-muted">Evaluation metrics are not available for this run.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="forecast-metrics-heading">
      <h2 id="forecast-metrics-heading" className="sr-only">Evaluation metrics</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="MAE" value={formatForecastValue(metrics.mae)} />
        <MetricCard label="RMSE" value={formatForecastValue(metrics.rmse)} />
        <MetricCard label="MAPE" value={formatForecastPercentage(metrics.mape)} />
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-foreground-muted">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
