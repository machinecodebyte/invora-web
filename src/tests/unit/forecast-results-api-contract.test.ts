import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { createHttpForecastResultsService } from '@/features/forecasting/api';
import { ApiClient } from '@/lib/api-client';
import { errorEnvelope, TEST_API_BASE_URL } from '@/tests/mocks/handlers';
import { server } from '@/tests/mocks/server';

const RUN_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const metric = {
  model_name: 'contract_model',
  mae: '0.1000',
  rmse: '0.2000',
  mape: '5.0000',
  training_rows: 20,
  validation_rows: 4,
  total_products: 1,
  fallback_products: 0,
  created_at: '2026-09-24T08:00:00Z',
};

function service() {
  return createHttpForecastResultsService(
    new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => 'contract-access-token',
    }),
  );
}

describe('Forecast Results HTTP contract', () => {
  it('uses backend envelopes, authenticated routes, supported filters, and backend pagination', async () => {
    server.use(
      http.get(
        `${TEST_API_BASE_URL}/api/v1/forecast-results/runs/${RUN_ID}`,
        ({ request }) => {
          expect(request.headers.get('authorization')).toBe(
            'Bearer contract-access-token',
          );
          return HttpResponse.json({
            success: true,
            data: {
              run_id: RUN_ID,
              status: 'completed',
              horizon_days: 7,
              requested_at: '2026-09-24T07:00:00Z',
              completed_at: '2026-09-24T08:00:00Z',
              model_name: 'contract_model',
              total_products: 1,
              total_predictions: 1,
              forecast_start_date: '2026-10-01',
              forecast_end_date: '2026-10-01',
              total_predicted_demand: '3.500',
              average_predicted_demand: '3.500',
              metrics: metric,
            },
          });
        },
      ),
      http.get(
        `${TEST_API_BASE_URL}/api/v1/forecast-results/runs/${RUN_ID}/predictions`,
        ({ request }) => {
          expect(request.headers.get('authorization')).toBe(
            'Bearer contract-access-token',
          );
          const url = new URL(request.url);
          expect(Object.fromEntries(url.searchParams)).toEqual({
            search: 'BLUE',
            date_from: '2026-10-01',
            limit: '50',
            offset: '50',
            sort_by: 'forecast_date',
            sort_order: 'asc',
          });
          return HttpResponse.json({
            success: true,
            data: {
              predictions: [],
              total: 51,
              limit: 50,
              offset: 50,
            },
          });
        },
      ),
      http.get(
        `${TEST_API_BASE_URL}/api/v1/forecast-results/runs/${RUN_ID}/metrics`,
        () => HttpResponse.json({ success: true, data: { metrics: metric } }),
      ),
      http.get(
        `${TEST_API_BASE_URL}/api/v1/forecast-results/runs/${RUN_ID}/chart`,
        ({ request }) => {
          const url = new URL(request.url);
          expect(Object.fromEntries(url.searchParams)).toEqual({
            date_from: '2026-10-01',
            interval: 'day',
          });
          return HttpResponse.json({
            success: true,
            data: {
              metadata: { run_id: RUN_ID, horizon_days: 7, interval: 'day' },
              points: [],
            },
          });
        },
      ),
    );

    const data = await service().getForecastResults({
      runId: RUN_ID,
      search: ' BLUE ',
      dateFrom: '2026-10-01',
      dateTo: null,
      limit: 50,
      offset: 50,
      sortBy: 'forecast_date',
      sortOrder: 'asc',
      chartInterval: 'day',
    });

    expect(data.predictions).toMatchObject({ total: 51, offset: 50 });
    expect(data.chart).toEqual({
      runId: RUN_ID,
      horizonDays: 7,
      interval: 'day',
      points: [],
    });
  });

  it('maps the backend not-ready and product-not-found codes safely', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/forecast-results/runs/${RUN_ID}`, () =>
        HttpResponse.json(
          errorEnvelope(
            'forecast_results_not_ready',
            'Forecast results are not ready for this run.',
          ),
          { status: 409 },
        ),
      ),
      http.get(
        `${TEST_API_BASE_URL}/api/v1/forecast-results/runs/${RUN_ID}/products/${PRODUCT_ID}`,
        () =>
          HttpResponse.json(
            errorEnvelope(
              'forecast_result_product_not_found',
              'Forecast result product was not found.',
            ),
            { status: 404 },
          ),
      ),
    );

    await expect(
      service().getForecastResults({
        runId: RUN_ID,
        search: null,
        dateFrom: null,
        dateTo: null,
        limit: 50,
        offset: 0,
        sortBy: 'forecast_date',
        sortOrder: 'asc',
        chartInterval: 'day',
      }),
    ).rejects.toMatchObject({ code: 'forecast_results_not_ready' });
    await expect(
      service().getProductForecastResult(RUN_ID, PRODUCT_ID),
    ).rejects.toMatchObject({
      code: 'forecast_result_product_not_found',
      message: 'Forecast detail is not available for this product.',
    });
  });
});
