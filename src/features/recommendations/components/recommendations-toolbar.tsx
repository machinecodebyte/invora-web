'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  RECOMMENDATION_RISK_LEVELS,
  RECOMMENDATION_STATUSES,
} from '@/features/recommendations/types';
import type {
  RecommendationFilters,
  RecommendationRiskFilter,
  RecommendationStatusFilter,
} from '@/features/recommendations/types';

const RISK_FILTER_LABELS: Readonly<Record<RecommendationRiskFilter, string>> = {
  all: 'All risk levels',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  overstocked: 'Overstocked',
};

const STATUS_FILTER_LABELS: Readonly<Record<RecommendationStatusFilter, string>> = {
  all: 'All statuses',
  open: 'Open',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
};

export interface RecommendationsToolbarProps {
  readonly filters: RecommendationFilters;
  /** The run-scoped backend list endpoint intentionally does not accept search. */
  readonly showSearch?: boolean | undefined;
  readonly onFiltersChange: (filters: RecommendationFilters) => void;
  readonly onClearFilters: () => void;
}

/** Search product/SKU and filter by the backend's risk-level enumeration. */
export function RecommendationsToolbar({
  filters,
  showSearch = true,
  onFiltersChange,
  onClearFilters,
}: RecommendationsToolbarProps) {
  const hasActiveFilters =
    (showSearch && filters.search !== '') ||
    filters.riskLevel !== 'all' ||
    filters.status !== 'all';

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end">
      {showSearch ? (
        <div className="min-w-0 flex-1">
          <Label htmlFor="recommendations-search">Search recommendations</Label>
          <Input
            id="recommendations-search"
            type="search"
            placeholder="Search product name or SKU"
            value={filters.search}
            maxLength={255}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
            className="mt-1.5"
          />
        </div>
      ) : null}
      <div className="w-full sm:w-48">
        <Label htmlFor="recommendations-risk-filter">Risk level</Label>
        <Select
          id="recommendations-risk-filter"
          value={filters.riskLevel}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              riskLevel: event.target.value as RecommendationRiskFilter,
            })
          }
          className="mt-1.5"
        >
          <option value="all">{RISK_FILTER_LABELS.all}</option>
          {RECOMMENDATION_RISK_LEVELS.map((riskLevel) => (
            <option key={riskLevel} value={riskLevel}>
              {RISK_FILTER_LABELS[riskLevel]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-48">
        <Label htmlFor="recommendations-status-filter">Recommendation status</Label>
        <Select
          id="recommendations-status-filter"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as RecommendationStatusFilter,
            })
          }
          className="mt-1.5"
        >
          <option value="all">{STATUS_FILTER_LABELS.all}</option>
          {RECOMMENDATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_FILTER_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button variant="ghost" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
