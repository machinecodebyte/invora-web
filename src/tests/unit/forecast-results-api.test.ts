import { describe, expect, it } from 'vitest';

import {
  createUnavailableForecastResultsService,
} from '@/features/forecasting/api';

describe('Forecast Results service boundary', () => {
  it('keeps normal runtime unavailable without an HTTP request or fabricated data', async () => {
    const service = createUnavailableForecastResultsService();

    await expect(
      service.getForecastResults({
        runId: '11111111-1111-4111-8111-111111111111',
        search: null,
        dateFrom: null,
        dateTo: null,
        limit: 50,
        offset: 0,
        sortBy: 'forecast_date',
        sortOrder: 'asc',
        chartInterval: 'day',
      }),
    ).rejects.toMatchObject({
      code: 'forecast_results_unavailable',
      message: 'Forecast Results are not available yet.',
    });
  });
});
