'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  forecastResultsFiltersSchema,
  toForecastResultsFilters,
} from '@/features/forecasting/schemas';
import type { ForecastResultsFilters } from '@/features/forecasting/types';

interface FilterErrors {
  search?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface ForecastResultsToolbarProps {
  readonly filters: ForecastResultsFilters;
  readonly isLoading: boolean;
  readonly onFiltersChange: (filters: ForecastResultsFilters) => void;
  readonly onClearFilters: () => void;
}

/** Backend-supported product/SKU search and forecast-date filter controls. */
export function ForecastResultsToolbar({
  filters,
  isLoading,
  onFiltersChange,
  onClearFilters,
}: ForecastResultsToolbarProps) {
  const [draft, setDraft] = useState<ForecastResultsFilters>(filters);
  const [errors, setErrors] = useState<FilterErrors>({});

  const update = (key: keyof ForecastResultsFilters, value: string): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const apply = (): void => {
    const result = forecastResultsFiltersSchema.safeParse(draft);
    if (!result.success) {
      const fieldErrors: FilterErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'search' || field === 'dateFrom' || field === 'dateTo') {
          fieldErrors[field] ??= issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onFiltersChange(toForecastResultsFilters(result.data));
  };

  const clear = (): void => {
    const empty: ForecastResultsFilters = { search: '', dateFrom: '', dateTo: '' };
    setDraft(empty);
    setErrors({});
    onClearFilters();
  };

  return (
    <Card aria-label="Forecast Result filters">
      <CardContent className="p-5">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <div>
            <Label htmlFor="forecast-results-search">Search product or SKU</Label>
            <Input
              id="forecast-results-search"
              value={draft.search}
              onChange={(event) => update('search', event.target.value)}
              maxLength={255}
              aria-describedby={errors.search === undefined ? undefined : 'forecast-results-search-error'}
              invalid={errors.search !== undefined}
            />
            {errors.search === undefined ? null : (
              <p id="forecast-results-search-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.search}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="forecast-results-date-from">Forecast date from</Label>
            <Input
              id="forecast-results-date-from"
              type="date"
              value={draft.dateFrom}
              onChange={(event) => update('dateFrom', event.target.value)}
              aria-describedby={errors.dateFrom === undefined ? undefined : 'forecast-results-date-from-error'}
              invalid={errors.dateFrom !== undefined}
            />
            {errors.dateFrom === undefined ? null : (
              <p id="forecast-results-date-from-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.dateFrom}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="forecast-results-date-to">Forecast date to</Label>
            <Input
              id="forecast-results-date-to"
              type="date"
              value={draft.dateTo}
              onChange={(event) => update('dateTo', event.target.value)}
              aria-describedby={errors.dateTo === undefined ? undefined : 'forecast-results-date-to-error'}
              invalid={errors.dateTo !== undefined}
            />
            {errors.dateTo === undefined ? null : (
              <p id="forecast-results-date-to-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.dateTo}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" isLoading={isLoading} loadingLabel="Applying filters">
              Apply filters
            </Button>
            <Button type="button" variant="secondary" onClick={clear} disabled={isLoading}>
              Clear filters
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
