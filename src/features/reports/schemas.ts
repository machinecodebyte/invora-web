import { z } from 'zod';

import {
  REPORT_RECOMMENDATION_STATUSES,
  REPORT_RISK_LEVELS,
  REPORT_STOCK_STATUSES,
  REPORT_TYPES,
  type ReportFilters,
  type ReportQuery,
} from '@/features/reports/types';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const optionalDate = z
  .string()
  .refine((value) => value === '' || DATE_ONLY_PATTERN.test(value), 'Enter a valid date.');

const optionalUuid = z
  .string()
  .trim()
  .refine((value) => value === '' || UUID_PATTERN.test(value), 'Enter a valid ID.');

/**
 * Client-side safety validation for the Reports backend's supported filters.
 * Demand forecasts require a forecast run; all other filters are optional.
 */
export const reportFiltersSchema = z
  .object({
    reportType: z.enum(REPORT_TYPES),
    dateFrom: optionalDate,
    dateTo: optionalDate,
    forecastRunId: optionalUuid,
    productId: optionalUuid,
    categoryId: optionalUuid,
    channel: z.string().trim().max(64, 'Channel must be 64 characters or fewer.'),
    riskLevel: z.enum(['all', ...REPORT_RISK_LEVELS]),
    recommendationStatus: z.enum(['all', ...REPORT_RECOMMENDATION_STATUSES]),
    stockStatus: z.enum(['all', ...REPORT_STOCK_STATUSES]),
  })
  .superRefine((values, context) => {
    if (
      values.dateFrom !== '' &&
      values.dateTo !== '' &&
      values.dateFrom > values.dateTo
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'End date must be on or after the start date.',
      });
    }
    if (values.reportType === 'demand_forecast' && values.forecastRunId === '') {
      context.addIssue({
        code: 'custom',
        path: ['forecastRunId'],
        message: 'A forecast run ID is required for the demand forecast report.',
      });
    }
  });

export type ReportFilterValues = z.infer<typeof reportFiltersSchema>;

/** Converts validated UI filters into only the parameters the selected report accepts. */
export function toReportQuery(filters: ReportFilters): ReportQuery {
  const optional = (value: string): string | null => (value === '' ? null : value.trim());
  const common = {
    reportType: filters.reportType,
    dateFrom: null,
    dateTo: null,
    forecastRunId: null,
    productId: null,
    categoryId: null,
    channel: null,
    riskLevel: null,
    recommendationStatus: null,
    stockStatus: null,
  };

  switch (filters.reportType) {
    case 'model_performance':
      return {
        ...common,
        dateFrom: optional(filters.dateFrom),
        dateTo: optional(filters.dateTo),
        forecastRunId: optional(filters.forecastRunId),
      };
    case 'inventory_risk':
      return {
        ...common,
        categoryId: optional(filters.categoryId),
        stockStatus: filters.stockStatus === 'all' ? null : filters.stockStatus,
      };
    case 'reorder_summary':
      return {
        ...common,
        forecastRunId: optional(filters.forecastRunId),
        riskLevel: filters.riskLevel === 'all' ? null : filters.riskLevel,
        recommendationStatus:
          filters.recommendationStatus === 'all'
            ? null
            : filters.recommendationStatus,
      };
    case 'demand_forecast':
      return {
        ...common,
        dateFrom: optional(filters.dateFrom),
        dateTo: optional(filters.dateTo),
        forecastRunId: optional(filters.forecastRunId),
        productId: optional(filters.productId),
        categoryId: optional(filters.categoryId),
      };
    case 'sales_summary':
      return {
        ...common,
        dateFrom: optional(filters.dateFrom),
        dateTo: optional(filters.dateTo),
        productId: optional(filters.productId),
        categoryId: optional(filters.categoryId),
        channel: optional(filters.channel),
      };
  }
}
