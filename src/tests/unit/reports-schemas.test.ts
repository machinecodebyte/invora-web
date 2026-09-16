import { describe, expect, it } from 'vitest';

import {
  reportFiltersSchema,
  toReportQuery,
} from '@/features/reports/schemas';
import type { ReportFilters } from '@/features/reports/types';

const baseFilters: ReportFilters = {
  reportType: 'sales_summary',
  dateFrom: '',
  dateTo: '',
  forecastRunId: '',
  productId: '',
  categoryId: '',
  channel: '',
  riskLevel: 'all',
  recommendationStatus: 'all',
  stockStatus: 'all',
};

describe('reportFiltersSchema', () => {
  it('accepts all backend report types and rejects invalid report-specific input', () => {
    for (const reportType of [
      'model_performance',
      'inventory_risk',
      'reorder_summary',
      'sales_summary',
    ] as const) {
      expect(reportFiltersSchema.safeParse({ ...baseFilters, reportType }).success).toBe(true);
    }
    expect(
      reportFiltersSchema.safeParse({ ...baseFilters, reportType: 'demand_forecast' }).success,
    ).toBe(false);
    expect(
      reportFiltersSchema.safeParse({ ...baseFilters, dateFrom: '2026-10-10', dateTo: '2026-10-01' })
        .success,
    ).toBe(false);
    expect(reportFiltersSchema.safeParse({ ...baseFilters, channel: 'x'.repeat(65) }).success).toBe(false);
  });

  it('maps each selected report to only its backend-supported query parameters', () => {
    const allFilters: ReportFilters = {
      ...baseFilters,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-15',
      forecastRunId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      productId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      channel: 'retail',
      riskLevel: 'critical',
      recommendationStatus: 'open',
      stockStatus: 'low_stock',
    };
    expect(toReportQuery({ ...allFilters, reportType: 'inventory_risk' })).toMatchObject({
      categoryId: allFilters.categoryId,
      stockStatus: 'low_stock',
      productId: null,
      dateFrom: null,
    });
    expect(toReportQuery({ ...allFilters, reportType: 'reorder_summary' })).toMatchObject({
      forecastRunId: allFilters.forecastRunId,
      riskLevel: 'critical',
      recommendationStatus: 'open',
      channel: null,
    });
    expect(toReportQuery({ ...allFilters, reportType: 'sales_summary' })).toMatchObject({
      dateFrom: allFilters.dateFrom,
      productId: allFilters.productId,
      categoryId: allFilters.categoryId,
      channel: 'retail',
      riskLevel: null,
    });
  });
});
