'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { buttonClassName, Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { RecommendationsService } from '@/features/recommendations/api';
import { RecommendationDetailDialog } from '@/features/recommendations/components/recommendation-detail-dialog';
import { RecommendationsSkeleton } from '@/features/recommendations/components/recommendations-skeleton';
import { RecommendationSummary } from '@/features/recommendations/components/recommendation-summary';
import { RecommendationsToolbar } from '@/features/recommendations/components/recommendations-toolbar';
import { RiskTable } from '@/features/recommendations/components/risk-table';
import {
  useRecommendationGeneration,
  useRecommendationSummary,
  useRecommendations,
} from '@/features/recommendations/hooks';
import { ROUTES } from '@/lib/constants';

export interface RecommendationsViewProps {
  readonly forecastRunId?: string | undefined;
  /** Dependency-injection seam for component tests and the normal HTTP adapter. */
  readonly service?: RecommendationsService | undefined;
}

/** Backend-authoritative Recommendations composition for global and run-specific review. */
export function RecommendationsView({
  forecastRunId,
  service,
}: RecommendationsViewProps) {
  const {
    state,
    filters,
    setFilters,
    clearFilters,
    setPageOffset,
    reload,
    isRunContext,
  } = useRecommendations(forecastRunId, service);
  const [summaryVersion, setSummaryVersion] = useState(0);
  const summary = useRecommendationSummary(forecastRunId, summaryVersion, service);
  const generation = useRecommendationGeneration(forecastRunId, service);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<
    string | null
  >(null);
  const hasFilters =
    (!isRunContext && filters.search !== '') ||
    filters.riskLevel !== 'all' ||
    filters.status !== 'all';

  useEffect(() => {
    if (
      generation.state.status === 'success' ||
      (generation.state.status === 'error' &&
        generation.state.code === 'recommendations_already_generated')
    ) {
      reload();
      setSummaryVersion((version) => version + 1);
    }
  }, [generation.state, reload]);

  const refreshRecommendations = (): void => {
    reload();
    setSummaryVersion((version) => version + 1);
  };

  if (state.status === 'invalid_run') {
    return (
      <EmptyState
        title="Forecast run identifier is invalid."
        description="Use a valid completed forecast run identifier to review recommendations."
        action={
          <Link
            href={ROUTES.recommendations}
            className={buttonClassName({ variant: 'secondary' })}
          >
            All recommendations
          </Link>
        }
      />
    );
  }

  if (state.status === 'loading') {
    return <RecommendationsSkeleton />;
  }

  if (state.status === 'not_generated') {
    return (
      <RunRecommendationEmpty
        generation={generation}
        onGenerate={() => void generation.generate()}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title={state.message}
        description="Please try again. If the problem continues, contact your administrator."
        onRetry={refreshRecommendations}
      />
    );
  }

  if (state.data.total === 0 && hasFilters) {
    return (
      <div className="space-y-6">
        <RecommendationsToolbar
          filters={filters}
          showSearch={!isRunContext}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
        />
        <EmptyState
          title="No recommendations match the current filters."
          description="Try another product, SKU, risk-level, or status filter."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      </div>
    );
  }

  if (state.data.total === 0) {
    return (
      <EmptyState
        title="No recommendations available."
        description="Reorder recommendations will appear when completed forecast data is available."
      />
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isRunContext ? 'Review run recommendations' : 'Review reorder risk'}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Review backend-generated stock risk and recommended reorder quantities.
          </p>
        </div>
        {isRunContext ? (
          <Link
            href={ROUTES.recommendations}
            className={buttonClassName({ variant: 'secondary' })}
          >
            All recommendations
          </Link>
        ) : null}
      </div>
      {isRunContext && summary.status === 'ready' ? (
        <RecommendationSummary summary={summary.data} />
      ) : null}
      {isRunContext && summary.status === 'error' ? (
        <ErrorState
          title={summary.message}
          description="The recommendation rows remain available below."
          onRetry={refreshRecommendations}
        />
      ) : null}
      <RecommendationsToolbar
        filters={filters}
        showSearch={!isRunContext}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />
      <RiskTable
        page={state.data}
        onPageChange={setPageOffset}
        onRecommendationDetail={setSelectedRecommendationId}
      />
      <p className="text-sm text-foreground-muted">
        {state.data.total} recommendation{state.data.total === 1 ? '' : 's'}
      </p>
      <RecommendationDetailDialog
        recommendationId={selectedRecommendationId}
        {...(service === undefined ? {} : { service })}
        onClose={() => setSelectedRecommendationId(null)}
        onUpdated={refreshRecommendations}
      />
    </div>
  );
}

function RunRecommendationEmpty({
  generation,
  onGenerate,
}: {
  readonly generation: ReturnType<typeof useRecommendationGeneration>;
  readonly onGenerate: () => void;
}) {
  return (
    <EmptyState
      title="Recommendations have not been generated for this forecast run."
      description="Generate the backend-owned recommendation set once the completed forecast and inventory data are available."
      action={
        <div className="space-y-3">
          <Button onClick={onGenerate} disabled={generation.state.status === 'pending'}>
            {generation.state.status === 'pending'
              ? 'Generating recommendationsâ€¦'
              : 'Generate recommendations'}
          </Button>
          {generation.state.status === 'success' ? (
            <p role="status" className="text-sm text-success">
              {generation.state.message}
            </p>
          ) : null}
          {generation.state.status === 'error' ? (
            <p role="alert" className="text-sm text-danger">
              {generation.state.message}
            </p>
          ) : null}
          <p className="max-w-prose text-xs text-foreground-muted">
            Generation does not adjust Inventory and does not create a purchase order.
          </p>
        </div>
      }
    />
  );
}
