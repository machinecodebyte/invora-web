import {
  ForecastResultsServiceError,
  type ForecastResultsService,
} from '@/features/forecasting/api';
import type {
  ForecastPredictionPage,
  ForecastResultsData,
  ForecastResultsQuery,
} from '@/features/forecasting/types';

export const FORECAST_RESULTS_RUN_ID = '11111111-1111-4111-8111-111111111111';
export const EMPTY_FORECAST_RESULTS_RUN_ID = '22222222-2222-4222-8222-222222222222';

export const FORECAST_RESULTS_DATA: ForecastResultsData = {
  overview: {
    runId: FORECAST_RESULTS_RUN_ID,
    status: 'completed',
    horizonDays: 7,
    requestedAt: '2026-06-01T09:00:00Z',
    completedAt: '2026-06-01T09:01:00Z',
    modelName: 'test-demand-model',
    totalProducts: 2,
    totalPredictions: 3,
    forecastStartDate: '2026-06-02',
    forecastEndDate: '2026-06-04',
    totalPredictedDemand: 21,
    averagePredictedDemand: 7,
    metrics: {
      modelName: 'test-demand-model',
      mae: 0,
      rmse: 0,
      mape: 0,
      trainingRows: 20,
      validationRows: 4,
      totalProducts: 2,
      fallbackProducts: 0,
      createdAt: '2026-06-01T09:01:00Z',
    },
  },
  predictions: {
    predictions: [
      {
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        productName: 'Zero-demand Widget',
        sku: 'ZERO-001',
        categoryId: null,
        categoryName: null,
        unit: 'units',
        currentStock: null,
        minimumStock: null,
        safetyStock: null,
        forecastDate: '2026-06-02',
        predictedDemand: 0,
        modelName: 'test-demand-model',
      },
      {
        productId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        productName: 'Blue Widget',
        sku: 'BLUE-001',
        categoryId: null,
        categoryName: null,
        unit: 'units',
        currentStock: null,
        minimumStock: null,
        safetyStock: null,
        forecastDate: '2026-06-03',
        predictedDemand: 12,
        modelName: 'test-demand-model',
      },
      {
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        productName: 'Zero-demand Widget',
        sku: 'ZERO-001',
        categoryId: null,
        categoryName: null,
        unit: 'units',
        currentStock: null,
        minimumStock: null,
        safetyStock: null,
        forecastDate: '2026-06-04',
        predictedDemand: 9,
        modelName: 'test-demand-model',
      },
    ],
    total: 3,
    limit: 50,
    offset: 0,
  },
  metrics: {
    modelName: 'test-demand-model',
    mae: 0,
    rmse: 0,
    mape: 0,
    trainingRows: 20,
    validationRows: 4,
    totalProducts: 2,
    fallbackProducts: 0,
    createdAt: '2026-06-01T09:01:00Z',
  },
  chart: {
    runId: FORECAST_RESULTS_RUN_ID,
    horizonDays: 7,
    interval: 'day',
    points: [
      { periodStart: '2026-06-02', predictedDemand: 0, actualQuantity: 0 },
      { periodStart: '2026-06-03', predictedDemand: 12, actualQuantity: null },
      { periodStart: '2026-06-04', predictedDemand: 9, actualQuantity: 7 },
    ],
  },
};

export const EMPTY_FORECAST_RESULTS_DATA: ForecastResultsData = {
  ...FORECAST_RESULTS_DATA,
  overview: {
    ...FORECAST_RESULTS_DATA.overview,
    runId: EMPTY_FORECAST_RESULTS_RUN_ID,
    totalPredictions: 0,
    totalPredictedDemand: 0,
    averagePredictedDemand: 0,
    forecastStartDate: null,
    forecastEndDate: null,
  },
  predictions: { predictions: [], total: 0, limit: 50, offset: 0 },
  chart: {
    runId: EMPTY_FORECAST_RESULTS_RUN_ID,
    horizonDays: 7,
    interval: 'day',
    points: [],
  },
};

function applyQuery(data: ForecastResultsData, query: ForecastResultsQuery): ForecastResultsData {
  const normalizedSearch = query.search?.toLocaleLowerCase('en-US') ?? '';
  const rows = data.predictions.predictions.filter(
    (row) =>
      (normalizedSearch === '' ||
        row.productName.toLocaleLowerCase('en-US').includes(normalizedSearch) ||
        row.sku.toLocaleLowerCase('en-US').includes(normalizedSearch)) &&
      (query.dateFrom === null || row.forecastDate >= query.dateFrom) &&
      (query.dateTo === null || row.forecastDate <= query.dateTo),
  );
  const predictions: ForecastPredictionPage = {
    predictions: rows.slice(query.offset, query.offset + query.limit),
    total: rows.length,
    limit: query.limit,
    offset: query.offset,
  };

  return {
    ...data,
    predictions,
    chart:
      data.chart === null
        ? null
        : {
            ...data.chart,
            points: data.chart.points.filter(
              (point) =>
                (query.dateFrom === null || point.periodStart >= query.dateFrom) &&
                (query.dateTo === null || point.periodStart <= query.dateTo),
            ),
          },
  };
}

export interface ForecastResultsTestServiceOptions {
  readonly data?: ForecastResultsData | undefined;
  readonly error?: Error | undefined;
}

/** Deterministic Module 8 adapter used only by component and hook tests. */
export function createForecastResultsTestService(
  options: ForecastResultsTestServiceOptions = {},
): ForecastResultsService {
  const data = options.data ?? FORECAST_RESULTS_DATA;
  return {
    getForecastResults: (query) => {
      if (options.error !== undefined) {
        return Promise.reject(options.error);
      }
      if (query.runId !== data.overview.runId) {
        return Promise.reject(
          new ForecastResultsServiceError(
            'forecast_results_unavailable',
            'Unable to load Forecast Results.',
          ),
        );
      }
      return Promise.resolve(applyQuery(data, query));
    },
  };
}
