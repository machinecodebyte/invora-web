'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { RecommendationsService } from '@/features/recommendations/api';
import { RecommendationsSkeleton } from '@/features/recommendations/components/recommendations-skeleton';
import { RecommendationsToolbar } from '@/features/recommendations/components/recommendations-toolbar';
import { RiskTable } from '@/features/recommendations/components/risk-table';
import { useRecommendations } from '@/features/recommendations/hooks';

export interface RecommendationsViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  readonly service?: RecommendationsService | undefined;
}

/** Module 9 read-only composition for the backend-owned recommendation decisions. */
export function RecommendationsView({ service }: RecommendationsViewProps) {
  const { state, filters, setFilters, clearFilters, setPageOffset, reload } =
    useRecommendations(service);
  const hasFilters =
    filters.search !== '' || filters.riskLevel !== 'all' || filters.status !== 'all';

  if (state.status === 'loading') {
    return <RecommendationsSkeleton />;
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        title={state.message}
        description="Please try again. If the problem continues, contact your administrator."
        onRetry={reload}
      />
    );
  }

  if (state.data.total === 0 && hasFilters) {
    return (
      <div className="space-y-6">
        <RecommendationsToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
        />
        <EmptyState
          title="No recommendations match the current filters."
          description="Try another product, SKU, or risk-level filter."
          action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
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
      <div>
        <h2 className="text-lg font-semibold text-foreground">Review reorder risk</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Review backend-generated stock risk and recommended reorder quantities.
        </p>
      </div>
      <RecommendationsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />
      <RiskTable page={state.data} onPageChange={setPageOffset} />
      <p className="text-sm text-foreground-muted">
        {state.data.total} recommendation{state.data.total === 1 ? '' : 's'}
      </p>
    </div>
  );
}
