'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  REPORT_DEFINITIONS,
  REPORT_RECOMMENDATION_STATUSES,
  REPORT_RISK_LEVELS,
  REPORT_STOCK_STATUSES,
  type ReportFilters,
  type ReportRecommendationStatusFilter,
  type ReportRiskFilter,
  type ReportStockStatusFilter,
  type ReportType,
} from '@/features/reports/types';

const RISK_LABELS: Readonly<Record<ReportRiskFilter, string>> = {
  all: 'All risk levels',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  overstocked: 'Overstocked',
};

const RECOMMENDATION_STATUS_LABELS: Readonly<
  Record<ReportRecommendationStatusFilter, string>
> = {
  all: 'All statuses',
  open: 'Open',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
};

const STOCK_STATUS_LABELS: Readonly<Record<ReportStockStatusFilter, string>> = {
  all: 'All stock statuses',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  healthy: 'Healthy',
  inactive: 'Inactive',
};

function supportsDateRange(reportType: ReportType): boolean {
  return (
    reportType === 'model_performance' ||
    reportType === 'demand_forecast' ||
    reportType === 'sales_summary'
  );
}

function supportsForecastRun(reportType: ReportType): boolean {
  return (
    reportType === 'model_performance' ||
    reportType === 'reorder_summary' ||
    reportType === 'demand_forecast'
  );
}

function supportsProductAndCategory(reportType: ReportType): boolean {
  return reportType === 'demand_forecast' || reportType === 'sales_summary';
}

function supportsCategory(reportType: ReportType): boolean {
  return reportType === 'inventory_risk' || supportsProductAndCategory(reportType);
}

export interface ReportFiltersProps {
  readonly filters: ReportFilters;
  readonly validationMessage: string | null;
  readonly validationField: keyof ReportFilters | null;
  readonly onFiltersChange: (filters: ReportFilters) => void;
  readonly onClearFilters: () => void;
}

/** Backend-aware filter controls for the currently selected report only. */
export function ReportFilters({
  filters,
  validationMessage,
  validationField,
  onFiltersChange,
  onClearFilters,
}: ReportFiltersProps) {
  const errorId = 'report-filter-error';
  const describeError = (field: keyof ReportFilters): string | undefined =>
    validationField === field && validationMessage !== null ? errorId : undefined;
  const isInvalid = (field: keyof ReportFilters): boolean => validationField === field;

  return (
    <form
      aria-label="Report filters"
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="min-w-0 lg:col-span-2">
          <Label htmlFor="report-type">Report type</Label>
          <Select
            id="report-type"
            value={filters.reportType}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                reportType: event.target.value as ReportType,
              })
            }
            className="mt-1.5"
          >
            {REPORT_DEFINITIONS.map((definition) => (
              <option key={definition.type} value={definition.type}>
                {definition.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-foreground-muted">
            {REPORT_DEFINITIONS.find((definition) => definition.type === filters.reportType)
              ?.description}
          </p>
        </div>
        {supportsDateRange(filters.reportType) ? (
          <>
            <div>
              <Label htmlFor="report-date-from">Start date</Label>
              <Input
                id="report-date-from"
                type="date"
                value={filters.dateFrom}
                aria-describedby={describeError('dateFrom')}
                invalid={isInvalid('dateFrom')}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dateFrom: event.target.value })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="report-date-to">End date</Label>
              <Input
                id="report-date-to"
                type="date"
                value={filters.dateTo}
                aria-describedby={describeError('dateTo')}
                invalid={isInvalid('dateTo')}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dateTo: event.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {supportsForecastRun(filters.reportType) ? (
          <div className="min-w-0">
            <Label htmlFor="report-forecast-run-id">
              Forecast run ID{filters.reportType === 'demand_forecast' ? ' (required)' : ''}
            </Label>
            <Input
              id="report-forecast-run-id"
              value={filters.forecastRunId}
              placeholder="00000000-0000-4000-8000-000000000000"
              autoComplete="off"
              maxLength={36}
              aria-describedby={describeError('forecastRunId')}
              invalid={isInvalid('forecastRunId')}
              onChange={(event) =>
                onFiltersChange({ ...filters, forecastRunId: event.target.value })
              }
              className="mt-1.5"
            />
          </div>
        ) : null}
        {supportsProductAndCategory(filters.reportType) ? (
          <div className="min-w-0">
            <Label htmlFor="report-product-id">Product ID</Label>
            <Input
              id="report-product-id"
              value={filters.productId}
              placeholder="Optional product UUID"
              autoComplete="off"
              maxLength={36}
              aria-describedby={describeError('productId')}
              invalid={isInvalid('productId')}
              onChange={(event) =>
                onFiltersChange({ ...filters, productId: event.target.value })
              }
              className="mt-1.5"
            />
          </div>
        ) : null}
        {supportsCategory(filters.reportType) ? (
          <div className="min-w-0">
            <Label htmlFor="report-category-id">Category ID</Label>
            <Input
              id="report-category-id"
              value={filters.categoryId}
              placeholder="Optional category UUID"
              autoComplete="off"
              maxLength={36}
              aria-describedby={describeError('categoryId')}
              invalid={isInvalid('categoryId')}
              onChange={(event) =>
                onFiltersChange({ ...filters, categoryId: event.target.value })
              }
              className="mt-1.5"
            />
          </div>
        ) : null}
        {filters.reportType === 'reorder_summary' ? (
          <>
            <div>
              <Label htmlFor="report-risk-level">Risk level</Label>
              <Select
                id="report-risk-level"
                value={filters.riskLevel}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    riskLevel: event.target.value as ReportRiskFilter,
                  })
                }
                className="mt-1.5"
              >
                <option value="all">{RISK_LABELS.all}</option>
                {REPORT_RISK_LEVELS.map((riskLevel) => (
                  <option key={riskLevel} value={riskLevel}>
                    {RISK_LABELS[riskLevel]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="report-recommendation-status">Recommendation status</Label>
              <Select
                id="report-recommendation-status"
                value={filters.recommendationStatus}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    recommendationStatus: event.target
                      .value as ReportRecommendationStatusFilter,
                  })
                }
                className="mt-1.5"
              >
                <option value="all">{RECOMMENDATION_STATUS_LABELS.all}</option>
                {REPORT_RECOMMENDATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RECOMMENDATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : null}
        {filters.reportType === 'inventory_risk' ? (
          <div>
            <Label htmlFor="report-stock-status">Stock status</Label>
            <Select
              id="report-stock-status"
              value={filters.stockStatus}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  stockStatus: event.target.value as ReportStockStatusFilter,
                })
              }
              className="mt-1.5"
            >
              <option value="all">{STOCK_STATUS_LABELS.all}</option>
              {REPORT_STOCK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STOCK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {filters.reportType === 'sales_summary' ? (
          <div>
            <Label htmlFor="report-channel">Sales channel</Label>
            <Input
              id="report-channel"
              value={filters.channel}
              maxLength={64}
              placeholder="Optional channel"
              aria-describedby={describeError('channel')}
              invalid={isInvalid('channel')}
              onChange={(event) =>
                onFiltersChange({ ...filters, channel: event.target.value })
              }
              className="mt-1.5"
            />
          </div>
        ) : null}
      </div>
      {validationMessage !== null ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {validationMessage}
        </p>
      ) : null}
      <div>
        <Button variant="secondary" size="sm" onClick={onClearFilters}>
          Reset report filters
        </Button>
      </div>
    </form>
  );
}
