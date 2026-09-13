import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatForecastDate, formatForecastValue } from '@/features/forecasting/components/forecast-results-formatters';
import type { ForecastResultOverview } from '@/features/forecasting/types';

export interface ForecastResultsSummaryProps {
  readonly overview: ForecastResultOverview;
}

/** Completed-run metadata and aggregate demand fields supplied by the backend. */
export function ForecastResultsSummary({ overview }: ForecastResultsSummaryProps) {
  return (
    <Card aria-labelledby="forecast-results-summary-heading">
      <CardHeader>
        <CardTitle as="h2" id="forecast-results-summary-heading">
          Forecast summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Run ID" value={overview.runId} mono />
          <SummaryItem label="Horizon" value={`${overview.horizonDays} days`} />
          <SummaryItem label="Model" value={overview.modelName ?? '—'} />
          <SummaryItem label="Products" value={formatForecastValue(overview.totalProducts)} />
          <SummaryItem label="Predictions" value={formatForecastValue(overview.totalPredictions)} />
          <SummaryItem label="Total predicted demand" value={formatForecastValue(overview.totalPredictedDemand)} />
          <SummaryItem label="Average predicted demand" value={formatForecastValue(overview.averagePredictedDemand)} />
          <SummaryItem
            label="Forecast range"
            value={
              overview.forecastStartDate === null || overview.forecastEndDate === null
                ? '—'
                : `${formatForecastDate(overview.forecastStartDate)} – ${formatForecastDate(overview.forecastEndDate)}`
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className={mono ? 'mt-1 truncate font-mono text-sm text-foreground' : 'mt-1 text-sm text-foreground'}>
        {value}
      </dd>
    </div>
  );
}
