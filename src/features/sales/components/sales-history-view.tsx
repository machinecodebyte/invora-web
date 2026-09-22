'use client';

import Link from 'next/link';

import { buttonClassName, Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { SalesHistoryService } from '@/features/sales/api';
import { SalesHistoryChart } from '@/features/sales/components/sales-history-chart';
import { SalesHistorySkeleton } from '@/features/sales/components/sales-history-skeleton';
import { SalesHistoryTable } from '@/features/sales/components/sales-history-table';
import { SalesHistoryToolbar } from '@/features/sales/components/sales-history-toolbar';
import { hasActiveSalesHistoryFilters, useSalesHistory } from '@/features/sales/hooks';
import { ROUTES } from '@/lib/constants';

export interface SalesHistoryViewProps {
  /** Dependency-injection seam for tests and the future Sales Transaction adapter. */
  readonly service?: SalesHistoryService | undefined;
}

/**
 * Read-only Sales History composition. List and trend states stay independent
 * so a chart failure never prevents an available transaction table from being
 * read.
 */
export function SalesHistoryView({ service }: SalesHistoryViewProps) {
  const {
    listState,
    chartState,
    filters,
    filterError,
    setFilters,
    clearFilters,
    setPageOffset,
    reload,
  } = useSalesHistory(service);
  const hasFilters = hasActiveSalesHistoryFilters(filters);

  const listContent =
    listState.status === 'loading' ? (
      <SalesHistorySkeleton />
    ) : listState.status === 'error' ? (
      <ErrorState
        title={listState.message}
        description="Please try again. If the problem continues, contact your administrator."
        onRetry={reload}
      />
    ) : listState.status === 'empty' ? (
      <EmptyState
        title="No sales records available."
        description="Sales history will appear when Sales Transaction data is available."
      />
    ) : listState.data.transactions.length === 0 && hasFilters ? (
      <EmptyState
        title="No matching sales records."
        description="No sales records match the current filters."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : listState.data.transactions.length === 0 ? (
      <EmptyState
        title="No sales records available."
        description="Sales history will appear when Sales Transaction data is available."
      />
    ) : (
      <SalesHistoryTable page={listState.data} onPageChange={setPageOffset} />
    );

  const chartProps =
    chartState.status === 'loading'
      ? { points: [], isLoading: true }
      : chartState.status === 'error'
        ? { points: [], errorMessage: chartState.message }
        : chartState.status === 'ready'
          ? { points: chartState.points }
          : { points: [] };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Review historical sales
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Search recorded transactions and review demand quantity over time.
          </p>
        </div>
        <Link
          href={ROUTES.salesUpload}
          className={buttonClassName({ variant: 'secondary' })}
        >
          Upload sales
        </Link>
      </div>

      <SalesHistoryToolbar
        filters={filters}
        dateError={filterError}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">{listContent}</div>
        <div className="min-w-0 xl:col-span-2">
          <SalesHistoryChart {...chartProps} />
        </div>
      </div>
    </div>
  );
}
