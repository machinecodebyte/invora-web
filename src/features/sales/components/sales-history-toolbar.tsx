'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { isSalesTransactionSource } from '@/features/sales/schemas';
import type { SalesHistoryFilters } from '@/features/sales/types';

export interface SalesHistoryToolbarProps {
  readonly filters: SalesHistoryFilters;
  readonly dateError: string | null;
  readonly onFiltersChange: (filters: SalesHistoryFilters) => void;
  readonly onClearFilters: () => void;
}

function hasActiveFilters(filters: SalesHistoryFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.source !== 'all'
  );
}

/**
 * Backend-aligned Sales Transaction filters. Product and SKU discovery use the
 * inspected API's supported text-search semantics; a Product Catalog request
 * is deliberately not made before the integration phase.
 */
export function SalesHistoryToolbar({
  filters,
  dateError,
  onFiltersChange,
  onClearFilters,
}: SalesHistoryToolbarProps) {
  const hasFilters = hasActiveFilters(filters);
  const dateErrorId = 'sales-history-date-error';

  return (
    <form
      aria-label="Sales history filters"
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 lg:grid-cols-6 lg:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="min-w-0 lg:col-span-2">
        <Label htmlFor="sales-history-search">Search product or SKU</Label>
        <Input
          id="sales-history-search"
          type="search"
          placeholder="Search product name or SKU"
          value={filters.search}
          onChange={(event) =>
            onFiltersChange({ ...filters, search: event.target.value })
          }
          className="mt-1.5"
        />
      </div>
      <div className="min-w-0">
        <Label htmlFor="sales-history-source">Source</Label>
        <Select
          id="sales-history-source"
          value={filters.source}
          onChange={(event) => {
            const source = event.target.value;
            if (source === 'all' || isSalesTransactionSource(source)) {
              onFiltersChange({ ...filters, source });
            }
          }}
          className="mt-1.5"
        >
          <option value="all">All sources</option>
          <option value="csv_upload">CSV upload</option>
          <option value="manual">Manual</option>
          <option value="api">API</option>
        </Select>
      </div>
      <div className="min-w-0">
        <Label htmlFor="sales-history-date-from">Start date</Label>
        <Input
          id="sales-history-date-from"
          type="date"
          value={filters.dateFrom}
          invalid={dateError !== null}
          aria-describedby={dateError === null ? undefined : dateErrorId}
          onChange={(event) =>
            onFiltersChange({ ...filters, dateFrom: event.target.value })
          }
          className="mt-1.5"
        />
      </div>
      <div className="min-w-0">
        <Label htmlFor="sales-history-date-to">End date</Label>
        <Input
          id="sales-history-date-to"
          type="date"
          value={filters.dateTo}
          invalid={dateError !== null}
          aria-describedby={dateError === null ? undefined : dateErrorId}
          onChange={(event) =>
            onFiltersChange({ ...filters, dateTo: event.target.value })
          }
          className="mt-1.5"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {hasFilters ? (
          <Button variant="ghost" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {dateError === null ? null : (
        <p id={dateErrorId} role="alert" className="text-sm text-danger lg:col-span-6">
          {dateError}
        </p>
      )}
    </form>
  );
}
