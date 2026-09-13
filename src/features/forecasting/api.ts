import {
  FORECAST_HORIZONS,
  FORECAST_RUN_STATUSES,
  type ForecastHorizon,
  type ForecastRun,
  type ForecastRunRequest,
  type ForecastRunStatus,
  type ForecastPrediction,
  type ForecastPredictionPage,
  type ForecastResultChart,
  type ForecastResultChartPoint,
  type ForecastResultMetrics,
  type ForecastResultOverview,
  type ForecastResultsData,
  type ForecastResultsQuery,
} from '@/features/forecasting/types';

export type ForecastRunServiceErrorCode =
  'forecast_runs_unavailable' | 'forecast_run_status_unavailable';

/** Safe error permitted across the Forecast Run service and UI boundary. */
export class ForecastRunServiceError extends Error {
  constructor(
    public readonly code: ForecastRunServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ForecastRunServiceError';
  }
}

/**
 * Transport-independent boundary for starting a run and reading its lifecycle.
 * A future adapter will map the backend's create and status endpoints here.
 */
export interface ForecastRunService {
  startForecast(input: ForecastRunRequest): Promise<ForecastRun>;
  getForecastRunStatus(runId: string): Promise<ForecastRun>;
}

/**
 * Honest normal-runtime adapter. It makes no HTTP or ML request and never
 * reports a locally generated forecast run as persistent data.
 */
export function createUnavailableForecastRunService(): ForecastRunService {
  return {
    startForecast: () =>
      Promise.reject(
        new ForecastRunServiceError(
          'forecast_runs_unavailable',
          'Forecast runs are not available yet.',
        ),
      ),
    getForecastRunStatus: () =>
      Promise.reject(
        new ForecastRunServiceError(
          'forecast_run_status_unavailable',
          'Unable to refresh forecast run status.',
        ),
      ),
  };
}

/** Storage key read only by the Playwright-managed Forecast Run adapter. */
export const FORECAST_RUN_E2E_STORAGE_KEY = 'invora-e2e-forecast-run-fixture';

export type ForecastRunE2EFixture =
  | { readonly state: 'sequence'; readonly runs: readonly ForecastRun[] }
  | { readonly state: 'start_error' }
  | { readonly state: 'status_error'; readonly run: ForecastRun };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isForecastHorizon(value: unknown): value is ForecastHorizon {
  return (
    typeof value === 'number' && FORECAST_HORIZONS.includes(value as ForecastHorizon)
  );
}

function isForecastRunStatus(value: unknown): value is ForecastRunStatus {
  return (
    typeof value === 'string' &&
    FORECAST_RUN_STATUSES.includes(value as ForecastRunStatus)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isForecastRun(value: unknown): value is ForecastRun {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isForecastHorizon(value.horizonDays) &&
    isForecastRunStatus(value.status) &&
    typeof value.requestedAt === 'string' &&
    isNullableString(value.startedAt) &&
    isNullableString(value.completedAt) &&
    isNullableString(value.failedAt) &&
    isNullableString(value.cancelledAt) &&
    isNullableString(value.failureReason) &&
    isFiniteNumber(value.totalProducts) &&
    isFiniteNumber(value.totalSalesRecords) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isForecastRunSequence(value: unknown): value is readonly ForecastRun[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isForecastRun)) {
    return false;
  }

  const first = value[0];
  return (
    first !== undefined &&
    value.every((run) => run.id === first.id && run.horizonDays === first.horizonDays)
  );
}

function readE2EFixture(): ForecastRunE2EFixture | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const encodedFixture = window.sessionStorage.getItem(FORECAST_RUN_E2E_STORAGE_KEY);
  if (encodedFixture === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(encodedFixture);
    if (!isRecord(value)) {
      return null;
    }
    if (value.state === 'start_error') {
      return { state: 'start_error' };
    }
    if (value.state === 'status_error' && isForecastRun(value.run)) {
      return { state: 'status_error', run: value.run };
    }
    if (value.state === 'sequence' && isForecastRunSequence(value.runs)) {
      return { state: 'sequence', runs: value.runs };
    }
  } catch {
    // A malformed E2E fixture must not crash a frontend route.
  }

  return null;
}

function unavailableStartError(): ForecastRunServiceError {
  return new ForecastRunServiceError(
    'forecast_runs_unavailable',
    'Unable to start the forecast run.',
  );
}

/**
 * Deterministic test adapter selected only by Playwright's managed build.
 * Fixtures are supplied by each isolated browser context; this is not a mock
 * backend and carries no production forecast data or ML logic.
 */
export function createE2EForecastRunService(): ForecastRunService {
  let activeRunId: string | null = null;
  let statusIndex = 0;

  return {
    startForecast: (input) => {
      const fixture = readE2EFixture();
      if (fixture === null || fixture.state === 'start_error') {
        return Promise.reject(unavailableStartError());
      }

      const initialRun = fixture.state === 'sequence' ? fixture.runs[0] : fixture.run;
      if (initialRun === undefined || input.horizonDays !== initialRun.horizonDays) {
        return Promise.reject(unavailableStartError());
      }

      activeRunId = initialRun.id;
      statusIndex = 0;
      return Promise.resolve(initialRun);
    },
    getForecastRunStatus: (runId) => {
      const fixture = readE2EFixture();
      if (fixture === null || activeRunId === null || activeRunId !== runId) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_run_status_unavailable',
            'Unable to refresh forecast run status.',
          ),
        );
      }
      if (fixture.state === 'status_error') {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_run_status_unavailable',
            'Unable to refresh forecast run status.',
          ),
        );
      }
      if (fixture.state === 'start_error') {
        return Promise.reject(unavailableStartError());
      }

      statusIndex = Math.min(statusIndex + 1, fixture.runs.length - 1);
      const run = fixture.runs[statusIndex];
      return run === undefined
        ? Promise.reject(unavailableStartError())
        : Promise.resolve(run);
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE === 'true';

/** The sole Forecast Run service selected for the current frontend build. */
export const forecastRunService: ForecastRunService = isE2ETestMode
  ? createE2EForecastRunService()
  : createUnavailableForecastRunService();

export type ForecastResultsServiceErrorCode =
  | 'forecast_results_unavailable'
  | 'forecast_results_not_ready'
  | 'forecast_run_failed';

/** Safe, normalized error for the Forecast Results presentation boundary. */
export class ForecastResultsServiceError extends Error {
  constructor(
    public readonly code: ForecastResultsServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ForecastResultsServiceError';
  }
}

/**
 * Read-only transport boundary for a completed forecast result set. The future
 * HTTP adapter will map the backend's overview, listing, metrics, and chart
 * reads here; it must not expose paths or tokens to UI components.
 */
export interface ForecastResultsService {
  getForecastResults(query: ForecastResultsQuery): Promise<ForecastResultsData>;
}

/**
 * Normal-runtime adapter. Module 8 makes no backend or ML request and does not
 * manufacture forecast data. Backend integration will replace this adapter.
 */
export function createUnavailableForecastResultsService(): ForecastResultsService {
  return {
    getForecastResults: () =>
      Promise.reject(
        new ForecastResultsServiceError(
          'forecast_results_unavailable',
          'Forecast Results are not available yet.',
        ),
      ),
  };
}

/** Storage key consumed exclusively by the Playwright Forecast Results adapter. */
export const FORECAST_RESULTS_E2E_STORAGE_KEY =
  'invora-e2e-forecast-results-fixture';

export type ForecastResultsE2EFixture =
  | { readonly state: 'ready'; readonly data: ForecastResultsData }
  | { readonly state: 'not_ready' }
  | { readonly state: 'failed_run' }
  | { readonly state: 'error' };

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isForecastResultMetrics(value: unknown): value is ForecastResultMetrics {
  return (
    isRecord(value) &&
    typeof value.modelName === 'string' &&
    (value.mae === null || isFiniteNumber(value.mae)) &&
    (value.rmse === null || isFiniteNumber(value.rmse)) &&
    (value.mape === null || isFiniteNumber(value.mape)) &&
    isFiniteNumber(value.trainingRows) &&
    isFiniteNumber(value.validationRows) &&
    isFiniteNumber(value.totalProducts) &&
    isFiniteNumber(value.fallbackProducts) &&
    typeof value.createdAt === 'string'
  );
}

function isForecastResultOverview(value: unknown): value is ForecastResultOverview {
  return (
    isRecord(value) &&
    typeof value.runId === 'string' &&
    value.status === 'completed' &&
    isForecastHorizon(value.horizonDays) &&
    typeof value.requestedAt === 'string' &&
    isStringOrNull(value.completedAt) &&
    isStringOrNull(value.modelName) &&
    isFiniteNumber(value.totalProducts) &&
    isFiniteNumber(value.totalPredictions) &&
    isStringOrNull(value.forecastStartDate) &&
    isStringOrNull(value.forecastEndDate) &&
    isFiniteNumber(value.totalPredictedDemand) &&
    isFiniteNumber(value.averagePredictedDemand) &&
    (value.metrics === null || isForecastResultMetrics(value.metrics))
  );
}

function isForecastPrediction(value: unknown): value is ForecastPrediction {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.sku === 'string' &&
    isStringOrNull(value.categoryId) &&
    isStringOrNull(value.categoryName) &&
    typeof value.unit === 'string' &&
    (value.currentStock === null || isFiniteNumber(value.currentStock)) &&
    (value.minimumStock === null || isFiniteNumber(value.minimumStock)) &&
    (value.safetyStock === null || isFiniteNumber(value.safetyStock)) &&
    typeof value.forecastDate === 'string' &&
    isFiniteNumber(value.predictedDemand) &&
    typeof value.modelName === 'string'
  );
}

function isForecastPredictionPage(value: unknown): value is ForecastPredictionPage {
  return (
    isRecord(value) &&
    Array.isArray(value.predictions) &&
    value.predictions.every(isForecastPrediction) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.limit) &&
    isFiniteNumber(value.offset)
  );
}

function isForecastResultChartPoint(value: unknown): value is ForecastResultChartPoint {
  return (
    isRecord(value) &&
    typeof value.periodStart === 'string' &&
    isFiniteNumber(value.predictedDemand) &&
    (value.actualQuantity === null || isFiniteNumber(value.actualQuantity))
  );
}

function isForecastResultChart(value: unknown): value is ForecastResultChart {
  return (
    isRecord(value) &&
    typeof value.runId === 'string' &&
    isForecastHorizon(value.horizonDays) &&
    (value.interval === 'day' || value.interval === 'week' || value.interval === 'month') &&
    Array.isArray(value.points) &&
    value.points.every(isForecastResultChartPoint)
  );
}

function isForecastResultsData(value: unknown): value is ForecastResultsData {
  return (
    isRecord(value) &&
    isForecastResultOverview(value.overview) &&
    isForecastPredictionPage(value.predictions) &&
    (value.metrics === null || isForecastResultMetrics(value.metrics)) &&
    (value.chart === null || isForecastResultChart(value.chart)) &&
    (value.chartError === undefined || typeof value.chartError === 'string')
  );
}

function readForecastResultsE2EFixture(): ForecastResultsE2EFixture | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const encodedFixture = window.sessionStorage.getItem(
    FORECAST_RESULTS_E2E_STORAGE_KEY,
  );
  if (encodedFixture === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(encodedFixture);
    if (!isRecord(value)) {
      return null;
    }
    if (value.state === 'not_ready') {
      return { state: 'not_ready' };
    }
    if (value.state === 'failed_run') {
      return { state: 'failed_run' };
    }
    if (value.state === 'error') {
      return { state: 'error' };
    }
    if (value.state === 'ready' && isForecastResultsData(value.data)) {
      return { state: 'ready', data: value.data };
    }
  } catch {
    // Malformed test data must never crash a route or become forecast output.
  }

  return null;
}

function filterPredictionPage(
  page: ForecastPredictionPage,
  query: ForecastResultsQuery,
): ForecastPredictionPage {
  const normalizedSearch = query.search?.trim().toLocaleLowerCase('en-US') ?? '';
  const filtered = page.predictions.filter((prediction) => {
    const matchesSearch =
      normalizedSearch === '' ||
      prediction.productName.toLocaleLowerCase('en-US').includes(normalizedSearch) ||
      prediction.sku.toLocaleLowerCase('en-US').includes(normalizedSearch);
    const matchesStart =
      query.dateFrom === null || prediction.forecastDate >= query.dateFrom;
    const matchesEnd = query.dateTo === null || prediction.forecastDate <= query.dateTo;
    return matchesSearch && matchesStart && matchesEnd;
  });
  const sorted = [...filtered].sort((left, right) =>
    left.forecastDate.localeCompare(right.forecastDate),
  );

  return {
    predictions: sorted.slice(query.offset, query.offset + query.limit),
    total: sorted.length,
    limit: query.limit,
    offset: query.offset,
  };
}

function filterChart(
  chart: ForecastResultChart | null,
  query: ForecastResultsQuery,
): ForecastResultChart | null {
  if (chart === null) {
    return null;
  }

  return {
    ...chart,
    interval: query.chartInterval,
    points: chart.points.filter(
      (point) =>
        (query.dateFrom === null || point.periodStart >= query.dateFrom) &&
        (query.dateTo === null || point.periodStart <= query.dateTo),
    ),
  };
}

/**
 * Deterministic E2E-only adapter. Its fixture is browser-session scoped and
 * supplied from test infrastructure; it is not a backend mock or production
 * result store.
 */
export function createE2EForecastResultsService(): ForecastResultsService {
  return {
    getForecastResults: (query) => {
      const fixture = readForecastResultsE2EFixture();
      if (fixture === null || fixture.state === 'error') {
        return Promise.reject(
          new ForecastResultsServiceError(
            'forecast_results_unavailable',
            'Unable to load Forecast Results.',
          ),
        );
      }
      if (fixture.state === 'not_ready') {
        return Promise.reject(
          new ForecastResultsServiceError(
            'forecast_results_not_ready',
            'Forecast results are not available yet.',
          ),
        );
      }
      if (fixture.state === 'failed_run') {
        return Promise.reject(
          new ForecastResultsServiceError(
            'forecast_run_failed',
            'Forecast results are unavailable because the run failed.',
          ),
        );
      }
      if (fixture.data.overview.runId !== query.runId) {
        return Promise.reject(
          new ForecastResultsServiceError(
            'forecast_results_unavailable',
            'Unable to load Forecast Results.',
          ),
        );
      }

      return Promise.resolve({
        ...fixture.data,
        predictions: filterPredictionPage(fixture.data.predictions, query),
        chart: filterChart(fixture.data.chart, query),
      });
    },
  };
}

const isForecastResultsE2ETestMode =
  process.env.NEXT_PUBLIC_FORECAST_RESULTS_E2E_TEST_MODE === 'true';

/** The single Forecast Results service selected for the current frontend build. */
export const forecastResultsService: ForecastResultsService =
  isForecastResultsE2ETestMode
    ? createE2EForecastResultsService()
    : createUnavailableForecastResultsService();
