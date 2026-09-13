'use client';

import Link from 'next/link';

import { buttonClassName, Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { ForecastResultsService } from '@/features/forecasting/api';
import { ActualVsPredictedChart } from '@/features/forecasting/components/actual-vs-predicted-chart';
import { ForecastMetrics } from '@/features/forecasting/components/forecast-metrics';
import { ForecastResultsSkeleton } from '@/features/forecasting/components/forecast-results-skeleton';
import { ForecastResultsSummary } from '@/features/forecasting/components/forecast-results-summary';
import { ForecastResultsTable } from '@/features/forecasting/components/forecast-results-table';
import { ForecastResultsToolbar } from '@/features/forecasting/components/forecast-results-toolbar';
import { useForecastResults } from '@/features/forecasting/hooks';
import { ROUTES } from '@/lib/constants';

export interface ForecastResultsViewProps {
  readonly runId?: string | undefined;
  /** Dependency-injection seam for tests and the later backend HTTP adapter. */
  readonly service?: ForecastResultsService | undefined;
}

/** Protected Module 8 composition, intentionally independent from Forecast Run UI. */
export function ForecastResultsView({ runId, service }: ForecastResultsViewProps) {
  const { state, filters, setFilters, clearFilters, setPageOffset, reload } = useForecastResults(runId, service);

  if (state.status === 'not_selected') {
    return <NoSelectedRun title="Select a forecast run to view results." description="Completed run results can be opened with a valid run identifier." />;
  }
  if (state.status === 'invalid_run') {
    return <NoSelectedRun title="Forecast run identifier is invalid." description="Use a valid completed forecast run identifier to view its results." />;
  }
  if (state.status === 'loading') {
    return <ForecastResultsSkeleton />;
  }
  if (state.status === 'not_ready') {
    return <NoSelectedRun title="Forecast results are not available yet." description="The forecast run must finish before its result data can be viewed." />;
  }
  if (state.status === 'failed_run') {
    return <NoSelectedRun title="Forecast results are unavailable because the run failed." description="No forecast result data can be shown for a failed run." />;
  }
  if (state.status === 'error') {
    return <ErrorState title={state.message} description="Please try again. If the problem continues, contact your administrator." onRetry={reload} />;
  }

  const hasFilters = filters.search !== '' || filters.dateFrom !== '' || filters.dateTo !== '';
  const data = state.data;

  if (state.status === 'empty') {
    return <NoSelectedRun title="No forecast results available." description="This completed run has no forecast prediction rows." />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Review forecast results</h2>
          <p className="mt-1 text-sm text-foreground-muted">Compare completed-run predictions with recorded actual demand where it is available.</p>
        </div>
        <Link href={ROUTES.forecastRuns} className={buttonClassName({ variant: 'secondary' })}>Forecast runs</Link>
      </div>

      <ForecastResultsToolbar filters={filters} isLoading={false} onFiltersChange={setFilters} onClearFilters={clearFilters} />
      <ForecastResultsSummary overview={data.overview} />
      <ForecastMetrics metrics={data.metrics} />
      <ActualVsPredictedChart chart={data.chart} errorMessage={data.chartError} />
      {data.predictions.predictions.length === 0 && hasFilters ? (
        <EmptyState title="No matching forecast predictions." description="No prediction rows match the current filters." action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
      ) : (
        <ForecastResultsTable page={data.predictions} onPageChange={setPageOffset} />
      )}
    </div>
  );
}

function NoSelectedRun({ title, description }: { readonly title: string; readonly description: string }) {
  return <EmptyState title={title} description={description} action={<Link href={ROUTES.forecastRuns} className={buttonClassName({ variant: 'secondary' })}>Forecast runs</Link>} />;
}
