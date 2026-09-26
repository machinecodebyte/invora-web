'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { ReportsService } from '@/features/reports/api';
import { ReportExportActions } from '@/features/reports/components/report-export-actions';
import { ReportFilters } from '@/features/reports/components/report-filters';
import { ReportSummary } from '@/features/reports/components/report-summary';
import { ReportTable } from '@/features/reports/components/report-table';
import { ReportsSkeleton } from '@/features/reports/components/reports-skeleton';
import { useReports } from '@/features/reports/hooks';

export interface ReportsViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  readonly service?: ReportsService | undefined;
}

/** Module 10 composition for read-only backend report views and CSV export. */
export function ReportsView({ service }: ReportsViewProps) {
  const {
    state,
    filters,
    validationMessage,
    validationField,
    exportState,
    setFilters,
    clearFilters,
    reload,
    exportCsv,
  } = useReports(service);

  const filtersPanel = (
    <ReportFilters
      filters={filters}
      validationMessage={validationMessage}
      validationField={validationField}
      onFiltersChange={setFilters}
      onClearFilters={clearFilters}
    />
  );

  if (validationMessage !== null) {
    return (
      <div className="space-y-6">
        {filtersPanel}
        <EmptyState
          title="Report filters need attention."
          description="Correct the highlighted filter before loading or exporting this report."
        />
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="space-y-6">
        {filtersPanel}
        <ReportsSkeleton />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-6">
        {filtersPanel}
        <ErrorState
          title={state.message}
          description="Please try again. If the problem continues, contact your administrator."
          onRetry={reload}
        />
      </div>
    );
  }

  const hasFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.forecastRunId !== '' ||
    filters.productId !== '' ||
    filters.categoryId !== '' ||
    filters.channel !== '' ||
    filters.riskLevel !== 'all' ||
    filters.recommendationStatus !== 'all' ||
    filters.stockStatus !== 'all';

  if (state.data.rows.length === 0) {
    return (
      <div className="space-y-6">
        {filtersPanel}
        <EmptyState
          title={
            hasFilters
              ? 'No report rows match the current filters.'
              : 'No report rows are available.'
          }
          description={
            hasFilters
              ? 'Try another report filter or reset the current filters.'
              : 'Report rows will appear when the selected source data is available.'
          }
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Reset report filters
                </Button>
              ) : null}
              <ReportExportActions state={exportState} onExportCsv={exportCsv} />
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {filtersPanel}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{state.data.title}</h2>
          <p className="mt-1 text-sm text-foreground-muted">{state.data.description}</p>
        </div>
        <ReportExportActions state={exportState} onExportCsv={exportCsv} />
      </div>
      <ReportSummary metrics={state.data.summary} />
      <ReportTable report={state.data} />
      <p className="text-sm text-foreground-muted">
        {state.data.rows.length} report row{state.data.rows.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
