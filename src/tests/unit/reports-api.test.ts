import { describe, expect, it } from 'vitest';

import { createUnavailableReportsService } from '@/features/reports/api';
import type { ReportsServiceError } from '@/features/reports/api';

describe('Reports service boundary', () => {
  it('does not provide a production report or export adapter before integration', async () => {
    const service = createUnavailableReportsService();
    await expect(
      service.getReport({
        reportType: 'sales_summary',
        dateFrom: null,
        dateTo: null,
        forecastRunId: null,
        productId: null,
        categoryId: null,
        channel: null,
        riskLevel: null,
        recommendationStatus: null,
        stockStatus: null,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReportsServiceError>>({
        code: 'reports_unavailable',
        message: 'Unable to load report.',
      }),
    );
    await expect(
      service.exportReport({
        query: {
          reportType: 'sales_summary',
          dateFrom: null,
          dateTo: null,
          forecastRunId: null,
          productId: null,
          categoryId: null,
          channel: null,
          riskLevel: null,
          recommendationStatus: null,
          stockStatus: null,
        },
        format: 'csv',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReportsServiceError>>({
        code: 'export_unavailable',
        message: 'Unable to export report.',
      }),
    );
  });
});
