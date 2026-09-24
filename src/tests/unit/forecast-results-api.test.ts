import { describe, expect, it, vi } from 'vitest';

import {
  createHttpForecastResultsService,
  mapForecastChartResponse,
  mapForecastMetricsDataResponse,
  mapForecastPredictionPageResponse,
  mapForecastProductResultResponse,
  mapForecastResultOverviewResponse,
} from '@/features/forecasting/api';
import { ApiClient, type FetchLike } from '@/lib/api-client';

const RUN_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const metrics = {
  model_name: 'persisted_model_v1',
  mae: '1.2500',
  rmse: '2.5000',
  mape: null,
  training_rows: 30,
  validation_rows: 6,
  total_products: 1,
  fallback_products: 0,
  created_at: '2026-09-24T08:00:00Z',
} as const;

const overview = {
  run_id: RUN_ID,
  status: 'completed',
  horizon_days: 7,
  requested_at: '2026-09-24T07:00:00Z',
  completed_at: '2026-09-24T08:00:00Z',
  model_name: 'persisted_model_v1',
  total_products: 1,
  total_predictions: 2,
  forecast_start_date: '2026-10-01',
  forecast_end_date: '2026-10-02',
  total_predicted_demand: '12.500',
  average_predicted_demand: '6.250',
  metrics,
} as const;

const prediction = {
  product_id: PRODUCT_ID,
  product_name: 'Blue Widget',
  sku: 'BLUE-001',
  category_id: null,
  category_name: null,
  unit: 'pcs',
  current_stock: '4.000',
  minimum_stock: null,
  safety_stock: '2.000',
  forecast_date: '2026-10-01',
  predicted_demand: '6.250',
  model_name: 'persisted_model_v1',
} as const;

const predictions = {
  predictions: [prediction],
  total: 2,
  limit: 50,
  offset: 0,
} as const;

const chart = {
  metadata: { run_id: RUN_ID, horizon_days: 7, interval: 'day' },
  points: [
    {
      period_start: '2026-10-01',
      predicted_demand: '6.250',
      actual_quantity: null,
    },
  ],
} as const;

const productDetail = {
  run_id: RUN_ID,
  horizon_days: 7,
  product_id: PRODUCT_ID,
  product_name: 'Blue Widget',
  sku: 'BLUE-001',
  category_id: null,
  category_name: null,
  unit: 'pcs',
  current_stock: '4.000',
  minimum_stock: null,
  safety_stock: '2.000',
  total_predicted_demand: '12.500',
  points: [
    {
      forecast_date: '2026-10-01',
      predicted_demand: '6.250',
      actual_quantity: null,
      model_name: 'persisted_model_v1',
    },
  ],
} as const;

function response(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const query = {
  runId: RUN_ID,
  search: ' Blue ',
  dateFrom: '2026-10-01',
  dateTo: '2026-10-02',
  limit: 50,
  offset: 0,
  sortBy: 'forecast_date' as const,
  sortOrder: 'asc' as const,
  chartInterval: 'day' as const,
};

describe('Forecast Results wire mapping', () => {
  it('maps persisted Decimal-compatible values and date-only strings at the API boundary', () => {
    expect(mapForecastResultOverviewResponse(overview)).toMatchObject({
      runId: RUN_ID,
      totalPredictedDemand: 12.5,
      averagePredictedDemand: 6.25,
      forecastStartDate: '2026-10-01',
      metrics: { mape: null },
    });
    expect(mapForecastPredictionPageResponse(predictions)).toMatchObject({
      total: 2,
      predictions: [
        {
          productId: PRODUCT_ID,
          forecastDate: '2026-10-01',
          predictedDemand: 6.25,
          currentStock: 4,
        },
      ],
    });
    expect(mapForecastMetricsDataResponse({ metrics })).toMatchObject({
      mae: 1.25,
      mape: null,
    });
    expect(mapForecastChartResponse(chart)).toEqual({
      runId: RUN_ID,
      horizonDays: 7,
      interval: 'day',
      points: [
        {
          periodStart: '2026-10-01',
          predictedDemand: 6.25,
          actualQuantity: null,
        },
      ],
    });
    expect(mapForecastProductResultResponse(productDetail)).toMatchObject({
      productId: PRODUCT_ID,
      totalPredictedDemand: 12.5,
      points: [{ forecastDate: '2026-10-01', actualQuantity: null }],
    });
  });

  it('rejects malformed result payloads without manufacturing forecast data', () => {
    expect(() =>
      mapForecastResultOverviewResponse({ ...overview, status: 'running' }),
    ).toThrow('Unable to read forecast results.');
    expect(() =>
      mapForecastPredictionPageResponse({ ...predictions, total: '2' }),
    ).toThrow('Unable to read forecast predictions.');
  });
});

describe('Forecast Results HTTP service', () => {
  it('uses exact Overview, Predictions, Metrics, Chart, and Product Result endpoints', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input, init) => {
      const url = new URL(String(input));
      expect(new Headers(init.headers).get('Authorization')).toBe(
        'Bearer access-token',
      );
      if (url.pathname.endsWith(`/forecast-results/runs/${RUN_ID}`)) {
        return response(overview);
      }
      if (url.pathname.endsWith(`/forecast-results/runs/${RUN_ID}/predictions`)) {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          search: 'Blue',
          date_from: '2026-10-01',
          date_to: '2026-10-02',
          limit: '50',
          offset: '0',
          sort_by: 'forecast_date',
          sort_order: 'asc',
        });
        return response(predictions);
      }
      if (url.pathname.endsWith(`/forecast-results/runs/${RUN_ID}/metrics`)) {
        return response({ metrics });
      }
      if (url.pathname.endsWith(`/forecast-results/runs/${RUN_ID}/chart`)) {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          date_from: '2026-10-01',
          date_to: '2026-10-02',
          interval: 'day',
        });
        return response(chart);
      }
      if (
        url.pathname.endsWith(`/forecast-results/runs/${RUN_ID}/products/${PRODUCT_ID}`)
      ) {
        return response(productDetail);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const service = createHttpForecastResultsService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        fetchImpl,
        getAccessToken: () => 'access-token',
      }),
    );

    const data = await service.getForecastResults(query);
    const detail = await service.getProductForecastResult(RUN_ID, PRODUCT_ID);

    expect(data.chart?.points[0]?.periodStart).toBe('2026-10-01');
    expect(data.metrics?.mape).toBeNull();
    expect(detail.productName).toBe('Blue Widget');
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it('keeps chart failure isolated after persisted overview, predictions, and metrics load', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const url = String(input);
      if (url.endsWith(`/forecast-results/runs/${RUN_ID}`)) {
        return response(overview);
      }
      if (url.includes('/predictions')) {
        return response(predictions);
      }
      if (url.endsWith('/metrics')) {
        return response({ metrics });
      }
      if (url.includes('/chart')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'service_unavailable',
              message: 'Chart service unavailable.',
            },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const service = createHttpForecastResultsService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(service.getForecastResults(query)).resolves.toMatchObject({
      overview: { runId: RUN_ID },
      predictions: { total: 2 },
      chart: null,
      chartError: 'Chart service unavailable.',
    });
  });

  it('maps the backend readiness code without treating it as a generic failure', async () => {
    const fetchImpl = vi.fn<FetchLike>(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'forecast_results_not_ready',
              message: 'Forecast results are not ready for this run.',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const service = createHttpForecastResultsService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(service.getForecastResults(query)).rejects.toMatchObject({
      code: 'forecast_results_not_ready',
    });
  });
});
