import {
  FORECAST_HORIZONS,
  FORECAST_JOB_STATUSES,
  FORECAST_RUN_STATUSES,
  type ForecastJob,
  type ForecastJobStatus,
  type ForecastHorizon,
  type ForecastRun,
  type ForecastRunRequest,
  type ForecastRunStatus,
  type ForecastPrediction,
  type ForecastPredictionPage,
  type ForecastProductResult,
  type ForecastProductResultPoint,
  type ForecastResultChart,
  type ForecastResultChartInterval,
  type ForecastResultChartPoint,
  type ForecastResultMetrics,
  type ForecastResultOverview,
  type ForecastResultsData,
  type ForecastResultsQuery,
} from '@/features/forecasting/types';
import { isApiError } from '@/lib/api-error';
import { apiClient, type ApiClient } from '@/lib/api-client';

export type ForecastRunServiceErrorCode =
  | 'forecast_runs_unavailable'
  | 'forecast_run_create_failed'
  | 'forecast_job_enqueue_failed'
  | 'forecast_job_status_unavailable'
  | 'forecast_run_status_unavailable';

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
 * Caller-owned cancellation options for Forecast Run and Background Job reads.
 */
export interface ForecastRunRequestOptions {
  readonly signal?: AbortSignal | undefined;
}

/** Transport-independent boundary for the Forecast Run/Job lifecycle. */
export interface ForecastRunService {
  startForecast(
    input: ForecastRunRequest,
    options?: ForecastRunRequestOptions,
  ): Promise<ForecastRun>;
  enqueueForecastRun(
    runId: string,
    options?: ForecastRunRequestOptions,
  ): Promise<ForecastJob>;
  getForecastJobStatus(
    jobId: string,
    options?: ForecastRunRequestOptions,
  ): Promise<ForecastJob>;
  getForecastRunStatus(
    runId: string,
    options?: ForecastRunRequestOptions,
  ): Promise<ForecastRun>;
}

type ForecastRunWire = {
  readonly id: string;
  readonly horizon_days: ForecastHorizon;
  readonly status: ForecastRunStatus;
  readonly requested_at: string;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly failed_at: string | null;
  readonly cancelled_at: string | null;
  readonly failure_reason: string | null;
  readonly total_products: number;
  readonly total_sales_records: number;
  readonly created_at: string;
  readonly updated_at: string;
};

type ForecastRunDataWire = {
  readonly run: ForecastRunWire;
};

type ForecastJobEnqueueWire = {
  readonly job_id: string;
  readonly forecast_run_id: string;
  readonly status: ForecastJobStatus;
  readonly queue_name: string;
  readonly enqueued_at: string;
  readonly status_url: string;
};

type ForecastJobWire = {
  readonly job_id: string;
  readonly job_type: 'forecast_processing';
  readonly entity_type: 'forecast_run';
  readonly entity_id: string;
  readonly status: ForecastJobStatus;
};

type ForecastJobDataWire = {
  readonly job: ForecastJobWire;
};

/**
 * Explicit unavailable fallback. It makes no HTTP or ML request and never
 * reports locally generated data as persistent Forecast Run state.
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
    enqueueForecastRun: () =>
      Promise.reject(
        new ForecastRunServiceError(
          'forecast_job_enqueue_failed',
          'Unable to queue the forecast run.',
        ),
      ),
    getForecastJobStatus: () =>
      Promise.reject(
        new ForecastRunServiceError(
          'forecast_job_status_unavailable',
          'Unable to refresh forecast processing status.',
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
  | {
      readonly state: 'sequence';
      readonly runs: readonly ForecastRun[];
      readonly jobs: readonly ForecastJob[];
    }
  | { readonly state: 'start_error' }
  | {
      readonly state: 'status_error';
      readonly run: ForecastRun;
      readonly job: ForecastJob;
    };

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

function isForecastJobStatus(value: unknown): value is ForecastJobStatus {
  return (
    typeof value === 'string' &&
    FORECAST_JOB_STATUSES.includes(value as ForecastJobStatus)
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

function isForecastJob(value: unknown): value is ForecastJob {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.runId === 'string' &&
    isForecastJobStatus(value.status)
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

function isForecastJobSequence(
  value: unknown,
  runId: string,
): value is readonly ForecastJob[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((job) => isForecastJob(job) && job.runId === runId)
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
    if (
      value.state === 'status_error' &&
      isForecastRun(value.run) &&
      isForecastJob(value.job) &&
      value.job.runId === value.run.id
    ) {
      return { state: 'status_error', run: value.run, job: value.job };
    }
    if (
      value.state === 'sequence' &&
      isForecastRunSequence(value.runs) &&
      value.runs[0] !== undefined &&
      isForecastJobSequence(value.jobs, value.runs[0].id)
    ) {
      return { state: 'sequence', runs: value.runs, jobs: value.jobs };
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
  let activeJobId: string | null = null;
  let statusIndex = 0;
  let jobStatusIndex = 0;

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
    enqueueForecastRun: (runId) => {
      const fixture = readE2EFixture();
      if (
        fixture === null ||
        fixture.state === 'start_error' ||
        activeRunId === null ||
        activeRunId !== runId
      ) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_job_enqueue_failed',
            'Unable to queue the forecast run.',
          ),
        );
      }
      const job = fixture.state === 'sequence' ? fixture.jobs[0] : fixture.job;
      if (job === undefined) {
        return Promise.reject(unavailableStartError());
      }
      activeJobId = job.id;
      jobStatusIndex = 0;
      return Promise.resolve(job);
    },
    getForecastJobStatus: (jobId) => {
      const fixture = readE2EFixture();
      if (fixture === null || activeJobId === null || activeJobId !== jobId) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_job_status_unavailable',
            'Unable to refresh forecast processing status.',
          ),
        );
      }
      if (fixture.state === 'status_error') {
        return Promise.resolve(fixture.job);
      }
      if (fixture.state !== 'sequence') {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_job_status_unavailable',
            'Unable to refresh forecast processing status.',
          ),
        );
      }
      jobStatusIndex = Math.min(jobStatusIndex + 1, fixture.jobs.length - 1);
      const job = fixture.jobs[jobStatusIndex];
      return job === undefined
        ? Promise.reject(unavailableStartError())
        : Promise.resolve(job);
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isForecastRunWire(value: unknown): value is ForecastRunWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isForecastHorizon(value.horizon_days) &&
    isForecastRunStatus(value.status) &&
    isNonEmptyString(value.requested_at) &&
    isNullableString(value.started_at) &&
    isNullableString(value.completed_at) &&
    isNullableString(value.failed_at) &&
    isNullableString(value.cancelled_at) &&
    isNullableString(value.failure_reason) &&
    isFiniteNumber(value.total_products) &&
    isFiniteNumber(value.total_sales_records) &&
    isNonEmptyString(value.created_at) &&
    isNonEmptyString(value.updated_at)
  );
}

function isForecastRunDataWire(value: unknown): value is ForecastRunDataWire {
  return isRecord(value) && isForecastRunWire(value.run);
}

function isForecastJobEnqueueWire(value: unknown): value is ForecastJobEnqueueWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.job_id) &&
    isNonEmptyString(value.forecast_run_id) &&
    isForecastJobStatus(value.status) &&
    isNonEmptyString(value.queue_name) &&
    isNonEmptyString(value.enqueued_at) &&
    isNonEmptyString(value.status_url)
  );
}

function isForecastJobWire(value: unknown): value is ForecastJobWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.job_id) &&
    value.job_type === 'forecast_processing' &&
    value.entity_type === 'forecast_run' &&
    isNonEmptyString(value.entity_id) &&
    isForecastJobStatus(value.status)
  );
}

function isForecastJobDataWire(value: unknown): value is ForecastJobDataWire {
  return isRecord(value) && isForecastJobWire(value.job);
}

function invalidForecastResponse(
  code: ForecastRunServiceErrorCode,
  message: string,
): ForecastRunServiceError {
  return new ForecastRunServiceError(code, message);
}

/** Maps a FastAPI Forecast Run public DTO to the feature's safe render model. */
export function mapForecastRunResponse(value: unknown): ForecastRun {
  if (!isForecastRunWire(value)) {
    throw invalidForecastResponse(
      'forecast_run_status_unavailable',
      'Unable to read forecast run status.',
    );
  }
  return {
    id: value.id,
    horizonDays: value.horizon_days,
    status: value.status,
    requestedAt: value.requested_at,
    startedAt: value.started_at,
    completedAt: value.completed_at,
    failedAt: value.failed_at,
    cancelledAt: value.cancelled_at,
    failureReason: value.failure_reason,
    totalProducts: value.total_products,
    totalSalesRecords: value.total_sales_records,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

/** Maps the create/read run response envelope after ApiClient unwraps it. */
export function mapForecastRunDataResponse(value: unknown): ForecastRun {
  if (!isForecastRunDataWire(value)) {
    throw invalidForecastResponse(
      'forecast_run_status_unavailable',
      'Unable to read forecast run status.',
    );
  }
  return mapForecastRunResponse(value.run);
}

/** Maps the enqueue acknowledgement; queue internals intentionally stay hidden. */
export function mapForecastJobEnqueueResponse(value: unknown): ForecastJob {
  if (!isForecastJobEnqueueWire(value)) {
    throw invalidForecastResponse(
      'forecast_job_enqueue_failed',
      'Unable to queue the forecast run.',
    );
  }
  return {
    id: value.job_id,
    runId: value.forecast_run_id,
    status: value.status,
  };
}

/** Maps the durable Background Job resource used only for Forecast tracking. */
export function mapForecastJobResponse(value: unknown): ForecastJob {
  if (!isForecastJobDataWire(value)) {
    throw invalidForecastResponse(
      'forecast_job_status_unavailable',
      'Unable to refresh forecast processing status.',
    );
  }
  return {
    id: value.job.job_id,
    runId: value.job.entity_id,
    status: value.job.status,
  };
}

function toFeatureError(
  error: unknown,
  code: ForecastRunServiceErrorCode,
  fallback: string,
): ForecastRunServiceError {
  if (error instanceof ForecastRunServiceError) {
    return error;
  }
  return new ForecastRunServiceError(
    code,
    isApiError(error) ? error.message : fallback,
  );
}

/**
 * Real Forecast Run/Background Jobs adapter for normal application builds.
 * All requests use the shared authenticated client; browser code never calls
 * Redis, RQ, the synchronous process route, or ML implementation directly.
 */
export function createHttpForecastRunService(
  client: ApiClient = apiClient,
): ForecastRunService {
  return {
    async startForecast(input, options) {
      try {
        const response = await client.post<unknown>(
          '/api/v1/forecast-runs',
          { horizon_days: input.horizonDays },
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        return mapForecastRunDataResponse(response);
      } catch (error) {
        throw toFeatureError(
          error,
          'forecast_run_create_failed',
          'Unable to start the forecast run.',
        );
      }
    },
    async enqueueForecastRun(runId, options) {
      try {
        const response = await client.post<unknown>(
          `/api/v1/jobs/forecast-runs/${encodeURIComponent(runId)}`,
          undefined,
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        const job = mapForecastJobEnqueueResponse(response);
        if (job.runId !== runId) {
          throw invalidForecastResponse(
            'forecast_job_enqueue_failed',
            'Unable to queue the forecast run.',
          );
        }
        return job;
      } catch (error) {
        throw toFeatureError(
          error,
          'forecast_job_enqueue_failed',
          'Unable to queue the forecast run.',
        );
      }
    },
    async getForecastJobStatus(jobId, options) {
      try {
        const response = await client.get<unknown>(
          `/api/v1/jobs/${encodeURIComponent(jobId)}`,
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        return mapForecastJobResponse(response);
      } catch (error) {
        throw toFeatureError(
          error,
          'forecast_job_status_unavailable',
          'Unable to refresh forecast processing status.',
        );
      }
    },
    async getForecastRunStatus(runId, options) {
      try {
        const response = await client.get<unknown>(
          `/api/v1/forecast-runs/${encodeURIComponent(runId)}`,
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        return mapForecastRunDataResponse(response);
      } catch (error) {
        throw toFeatureError(
          error,
          'forecast_run_status_unavailable',
          'Unable to refresh forecast run status.',
        );
      }
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE === 'true';

/** The sole Forecast Run service selected for the current frontend build. */
export const forecastRunService: ForecastRunService = isE2ETestMode
  ? createE2EForecastRunService()
  : createHttpForecastRunService();

export type ForecastResultsServiceErrorCode =
  | 'forecast_results_unavailable'
  | 'forecast_results_not_ready'
  | 'forecast_run_failed'
  | 'forecast_result_product_not_found';

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

/** Caller-owned cancellation options for Forecast Results reads. */
export interface ForecastResultsRequestOptions {
  readonly signal?: AbortSignal | undefined;
}

/** Read-only transport boundary for persisted Forecast Results data. */
export interface ForecastResultsService {
  getForecastResults(
    query: ForecastResultsQuery,
    options?: ForecastResultsRequestOptions,
  ): Promise<ForecastResultsData>;
  getProductForecastResult(
    runId: string,
    productId: string,
    options?: ForecastResultsRequestOptions,
  ): Promise<ForecastProductResult>;
}

type DecimalWire = string | number;

type ForecastResultMetricsWire = {
  readonly model_name: string;
  readonly mae: DecimalWire | null;
  readonly rmse: DecimalWire | null;
  readonly mape: DecimalWire | null;
  readonly training_rows: number;
  readonly validation_rows: number;
  readonly total_products: number;
  readonly fallback_products: number;
  readonly created_at: string;
};

type ForecastResultOverviewWire = {
  readonly run_id: string;
  readonly status: 'completed';
  readonly horizon_days: ForecastHorizon;
  readonly requested_at: string;
  readonly completed_at: string | null;
  readonly model_name: string | null;
  readonly total_products: number;
  readonly total_predictions: number;
  readonly forecast_start_date: string | null;
  readonly forecast_end_date: string | null;
  readonly total_predicted_demand: DecimalWire;
  readonly average_predicted_demand: DecimalWire;
  readonly metrics: ForecastResultMetricsWire | null;
};

type ForecastPredictionWire = {
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly unit: string;
  readonly current_stock: DecimalWire | null;
  readonly minimum_stock: DecimalWire | null;
  readonly safety_stock: DecimalWire | null;
  readonly forecast_date: string;
  readonly predicted_demand: DecimalWire;
  readonly model_name: string;
};

type ForecastPredictionPageWire = {
  readonly predictions: readonly ForecastPredictionWire[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

type ForecastMetricsDataWire = {
  readonly metrics: ForecastResultMetricsWire;
};

type ForecastChartMetadataWire = {
  readonly run_id: string;
  readonly horizon_days: ForecastHorizon;
  readonly interval: ForecastResultChartInterval;
};

type ForecastChartPointWire = {
  readonly period_start: string;
  readonly predicted_demand: DecimalWire;
  readonly actual_quantity: DecimalWire | null;
};

type ForecastChartDataWire = {
  readonly metadata: ForecastChartMetadataWire;
  readonly points: readonly ForecastChartPointWire[];
};

type ForecastProductResultPointWire = {
  readonly forecast_date: string;
  readonly predicted_demand: DecimalWire;
  readonly actual_quantity: DecimalWire | null;
  readonly model_name: string;
};

type ForecastProductResultWire = {
  readonly run_id: string;
  readonly horizon_days: ForecastHorizon;
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly unit: string;
  readonly current_stock: DecimalWire | null;
  readonly minimum_stock: DecimalWire | null;
  readonly safety_stock: DecimalWire | null;
  readonly total_predicted_demand: DecimalWire;
  readonly points: readonly ForecastProductResultPointWire[];
};

/**
 * Explicit unavailable fallback for isolated tests. It never manufactures
 * forecast output or becomes the normal application adapter.
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
    getProductForecastResult: () =>
      Promise.reject(
        new ForecastResultsServiceError(
          'forecast_result_product_not_found',
          'Forecast detail is not available for this product.',
        ),
      ),
  };
}

/** Storage key consumed exclusively by the Playwright Forecast Results adapter. */
export const FORECAST_RESULTS_E2E_STORAGE_KEY = 'invora-e2e-forecast-results-fixture';

export type ForecastResultsE2EFixture =
  | {
      readonly state: 'ready';
      readonly data: ForecastResultsData;
      readonly productResults?: readonly ForecastProductResult[] | undefined;
    }
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
    (value.interval === 'day' ||
      value.interval === 'week' ||
      value.interval === 'month') &&
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

function isForecastProductResult(value: unknown): value is ForecastProductResult {
  return (
    isRecord(value) &&
    typeof value.runId === 'string' &&
    isForecastHorizon(value.horizonDays) &&
    typeof value.productId === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.sku === 'string' &&
    isStringOrNull(value.categoryId) &&
    isStringOrNull(value.categoryName) &&
    typeof value.unit === 'string' &&
    (value.currentStock === null || isFiniteNumber(value.currentStock)) &&
    (value.minimumStock === null || isFiniteNumber(value.minimumStock)) &&
    (value.safetyStock === null || isFiniteNumber(value.safetyStock)) &&
    isFiniteNumber(value.totalPredictedDemand) &&
    Array.isArray(value.points) &&
    value.points.every(
      (point) =>
        isRecord(point) &&
        typeof point.forecastDate === 'string' &&
        isFiniteNumber(point.predictedDemand) &&
        (point.actualQuantity === null || isFiniteNumber(point.actualQuantity)) &&
        typeof point.modelName === 'string',
    )
  );
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDecimalWire(value: unknown): value is DecimalWire {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return (
    typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
  );
}

function isNullableDecimalWire(value: unknown): value is DecimalWire | null {
  return value === null || isDecimalWire(value);
}

function toDecimal(value: DecimalWire): number {
  return typeof value === 'number' ? value : Number(value);
}

function isForecastResultMetricsWire(
  value: unknown,
): value is ForecastResultMetricsWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.model_name) &&
    isNullableDecimalWire(value.mae) &&
    isNullableDecimalWire(value.rmse) &&
    isNullableDecimalWire(value.mape) &&
    isFiniteNumber(value.training_rows) &&
    isFiniteNumber(value.validation_rows) &&
    isFiniteNumber(value.total_products) &&
    isFiniteNumber(value.fallback_products) &&
    isNonEmptyString(value.created_at)
  );
}

function isForecastResultOverviewWire(
  value: unknown,
): value is ForecastResultOverviewWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.run_id) &&
    value.status === 'completed' &&
    isForecastHorizon(value.horizon_days) &&
    isNonEmptyString(value.requested_at) &&
    isNullableString(value.completed_at) &&
    isNullableString(value.model_name) &&
    isFiniteNumber(value.total_products) &&
    isFiniteNumber(value.total_predictions) &&
    (value.forecast_start_date === null || isDateOnly(value.forecast_start_date)) &&
    (value.forecast_end_date === null || isDateOnly(value.forecast_end_date)) &&
    isDecimalWire(value.total_predicted_demand) &&
    isDecimalWire(value.average_predicted_demand) &&
    (value.metrics === null || isForecastResultMetricsWire(value.metrics))
  );
}

function isForecastPredictionWire(value: unknown): value is ForecastPredictionWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.product_id) &&
    isNonEmptyString(value.product_name) &&
    isNonEmptyString(value.sku) &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isNonEmptyString(value.unit) &&
    isNullableDecimalWire(value.current_stock) &&
    isNullableDecimalWire(value.minimum_stock) &&
    isNullableDecimalWire(value.safety_stock) &&
    isDateOnly(value.forecast_date) &&
    isDecimalWire(value.predicted_demand) &&
    isNonEmptyString(value.model_name)
  );
}

function isForecastPredictionPageWire(
  value: unknown,
): value is ForecastPredictionPageWire {
  return (
    isRecord(value) &&
    Array.isArray(value.predictions) &&
    value.predictions.every(isForecastPredictionWire) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.limit) &&
    isFiniteNumber(value.offset)
  );
}

function isForecastMetricsDataWire(value: unknown): value is ForecastMetricsDataWire {
  return isRecord(value) && isForecastResultMetricsWire(value.metrics);
}

function isChartInterval(value: unknown): value is ForecastResultChartInterval {
  return value === 'day' || value === 'week' || value === 'month';
}

function isForecastChartDataWire(value: unknown): value is ForecastChartDataWire {
  if (!isRecord(value) || !isRecord(value.metadata) || !Array.isArray(value.points)) {
    return false;
  }
  return (
    isNonEmptyString(value.metadata.run_id) &&
    isForecastHorizon(value.metadata.horizon_days) &&
    isChartInterval(value.metadata.interval) &&
    value.points.every(
      (point) =>
        isRecord(point) &&
        isDateOnly(point.period_start) &&
        isDecimalWire(point.predicted_demand) &&
        isNullableDecimalWire(point.actual_quantity),
    )
  );
}

function isForecastProductResultWire(
  value: unknown,
): value is ForecastProductResultWire {
  return (
    isRecord(value) &&
    isNonEmptyString(value.run_id) &&
    isForecastHorizon(value.horizon_days) &&
    isNonEmptyString(value.product_id) &&
    isNonEmptyString(value.product_name) &&
    isNonEmptyString(value.sku) &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isNonEmptyString(value.unit) &&
    isNullableDecimalWire(value.current_stock) &&
    isNullableDecimalWire(value.minimum_stock) &&
    isNullableDecimalWire(value.safety_stock) &&
    isDecimalWire(value.total_predicted_demand) &&
    Array.isArray(value.points) &&
    value.points.every(
      (point) =>
        isRecord(point) &&
        isDateOnly(point.forecast_date) &&
        isDecimalWire(point.predicted_demand) &&
        isNullableDecimalWire(point.actual_quantity) &&
        isNonEmptyString(point.model_name),
    )
  );
}

function invalidForecastResultsResponse(message: string): ForecastResultsServiceError {
  return new ForecastResultsServiceError('forecast_results_unavailable', message);
}

export function mapForecastResultMetricsResponse(
  value: unknown,
): ForecastResultMetrics {
  if (!isForecastResultMetricsWire(value)) {
    throw invalidForecastResultsResponse('Unable to read forecast metrics.');
  }
  return {
    modelName: value.model_name,
    mae: value.mae === null ? null : toDecimal(value.mae),
    rmse: value.rmse === null ? null : toDecimal(value.rmse),
    mape: value.mape === null ? null : toDecimal(value.mape),
    trainingRows: value.training_rows,
    validationRows: value.validation_rows,
    totalProducts: value.total_products,
    fallbackProducts: value.fallback_products,
    createdAt: value.created_at,
  };
}

/** Maps the verified Forecast Results overview DTO. */
export function mapForecastResultOverviewResponse(
  value: unknown,
): ForecastResultOverview {
  if (!isForecastResultOverviewWire(value)) {
    throw invalidForecastResultsResponse('Unable to read forecast results.');
  }
  return {
    runId: value.run_id,
    status: value.status,
    horizonDays: value.horizon_days,
    requestedAt: value.requested_at,
    completedAt: value.completed_at,
    modelName: value.model_name,
    totalProducts: value.total_products,
    totalPredictions: value.total_predictions,
    forecastStartDate: value.forecast_start_date,
    forecastEndDate: value.forecast_end_date,
    totalPredictedDemand: toDecimal(value.total_predicted_demand),
    averagePredictedDemand: toDecimal(value.average_predicted_demand),
    metrics:
      value.metrics === null ? null : mapForecastResultMetricsResponse(value.metrics),
  };
}

function mapForecastPrediction(value: ForecastPredictionWire): ForecastPrediction {
  return {
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryId: value.category_id,
    categoryName: value.category_name,
    unit: value.unit,
    currentStock: value.current_stock === null ? null : toDecimal(value.current_stock),
    minimumStock: value.minimum_stock === null ? null : toDecimal(value.minimum_stock),
    safetyStock: value.safety_stock === null ? null : toDecimal(value.safety_stock),
    forecastDate: value.forecast_date,
    predictedDemand: toDecimal(value.predicted_demand),
    modelName: value.model_name,
  };
}

/** Maps the backend offset-pagination response without deriving totals locally. */
export function mapForecastPredictionPageResponse(
  value: unknown,
): ForecastPredictionPage {
  if (!isForecastPredictionPageWire(value)) {
    throw invalidForecastResultsResponse('Unable to read forecast predictions.');
  }
  return {
    predictions: value.predictions.map(mapForecastPrediction),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

export function mapForecastMetricsDataResponse(value: unknown): ForecastResultMetrics {
  if (!isForecastMetricsDataWire(value)) {
    throw invalidForecastResultsResponse('Unable to read forecast metrics.');
  }
  return mapForecastResultMetricsResponse(value.metrics);
}

/** Maps chart metadata and date-only aggregate points from persisted backend data. */
export function mapForecastChartResponse(value: unknown): ForecastResultChart {
  if (!isForecastChartDataWire(value)) {
    throw invalidForecastResultsResponse('Unable to read forecast comparison data.');
  }
  return {
    runId: value.metadata.run_id,
    horizonDays: value.metadata.horizon_days,
    interval: value.metadata.interval,
    points: value.points.map((point): ForecastResultChartPoint => ({
      periodStart: point.period_start,
      predictedDemand: toDecimal(point.predicted_demand),
      actualQuantity:
        point.actual_quantity === null ? null : toDecimal(point.actual_quantity),
    })),
  };
}

/** Maps the user-facing product-level Forecast Results DTO. */
export function mapForecastProductResultResponse(
  value: unknown,
): ForecastProductResult {
  if (!isForecastProductResultWire(value)) {
    throw invalidForecastResultsResponse('Unable to read product forecast detail.');
  }
  return {
    runId: value.run_id,
    horizonDays: value.horizon_days,
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryId: value.category_id,
    categoryName: value.category_name,
    unit: value.unit,
    currentStock: value.current_stock === null ? null : toDecimal(value.current_stock),
    minimumStock: value.minimum_stock === null ? null : toDecimal(value.minimum_stock),
    safetyStock: value.safety_stock === null ? null : toDecimal(value.safety_stock),
    totalPredictedDemand: toDecimal(value.total_predicted_demand),
    points: value.points.map((point): ForecastProductResultPoint => ({
      forecastDate: point.forecast_date,
      predictedDemand: toDecimal(point.predicted_demand),
      actualQuantity:
        point.actual_quantity === null ? null : toDecimal(point.actual_quantity),
      modelName: point.model_name,
    })),
  };
}

function toForecastResultsServiceError(
  error: unknown,
  fallback: string,
): ForecastResultsServiceError {
  if (error instanceof ForecastResultsServiceError) {
    return error;
  }
  if (isApiError(error) && error.code === 'forecast_results_not_ready') {
    return new ForecastResultsServiceError('forecast_results_not_ready', error.message);
  }
  if (isApiError(error) && error.code === 'forecast_result_product_not_found') {
    return new ForecastResultsServiceError(
      'forecast_result_product_not_found',
      'Forecast detail is not available for this product.',
    );
  }
  return new ForecastResultsServiceError(
    'forecast_results_unavailable',
    isApiError(error) ? error.message : fallback,
  );
}

function toForecastResultsQueryParams(
  query: ForecastResultsQuery,
): Record<string, string | number | null> {
  const search = query.search?.trim();
  return {
    search: search === undefined || search === '' ? null : search,
    date_from: query.dateFrom,
    date_to: query.dateTo,
    limit: query.limit,
    offset: query.offset,
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  };
}

function toForecastChartQueryParams(
  query: ForecastResultsQuery,
): Record<string, string | null> {
  return {
    date_from: query.dateFrom,
    date_to: query.dateTo,
    interval: query.chartInterval,
  };
}

/**
 * Real read-only Forecast Results adapter. Chart failures remain isolated so
 * overview, predictions, and persisted metrics stay usable.
 */
export function createHttpForecastResultsService(
  client: ApiClient = apiClient,
): ForecastResultsService {
  return {
    async getForecastResults(query, options) {
      const config =
        options?.signal === undefined ? undefined : { signal: options.signal };
      const encodedRunId = encodeURIComponent(query.runId);
      try {
        const overview = mapForecastResultOverviewResponse(
          await client.get<unknown>(
            `/api/v1/forecast-results/runs/${encodedRunId}`,
            config,
          ),
        );
        const [predictions, metrics] = await Promise.all([
          client
            .get<unknown>(`/api/v1/forecast-results/runs/${encodedRunId}/predictions`, {
              ...(config ?? {}),
              query: toForecastResultsQueryParams(query),
            })
            .then(mapForecastPredictionPageResponse),
          client
            .get<unknown>(
              `/api/v1/forecast-results/runs/${encodedRunId}/metrics`,
              config,
            )
            .then(mapForecastMetricsDataResponse)
            .catch((error: unknown): ForecastResultMetrics | null => {
              if (
                isApiError(error) &&
                error.code === 'forecast_result_metrics_not_found'
              ) {
                return null;
              }
              throw error;
            }),
        ]);

        try {
          const chart = mapForecastChartResponse(
            await client.get<unknown>(
              `/api/v1/forecast-results/runs/${encodedRunId}/chart`,
              {
                ...(config ?? {}),
                query: toForecastChartQueryParams(query),
              },
            ),
          );
          return { overview, predictions, metrics, chart };
        } catch (error: unknown) {
          return {
            overview,
            predictions,
            metrics,
            chart: null,
            chartError: toForecastResultsServiceError(
              error,
              'Unable to load forecast comparison data.',
            ).message,
          };
        }
      } catch (error: unknown) {
        throw toForecastResultsServiceError(error, 'Unable to load Forecast Results.');
      }
    },
    async getProductForecastResult(runId, productId, options) {
      try {
        const response = await client.get<unknown>(
          `/api/v1/forecast-results/runs/${encodeURIComponent(runId)}/products/${encodeURIComponent(productId)}`,
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        const detail = mapForecastProductResultResponse(response);
        if (detail.runId !== runId || detail.productId !== productId) {
          throw new ForecastResultsServiceError(
            'forecast_result_product_not_found',
            'Forecast detail is not available for this product.',
          );
        }
        return detail;
      } catch (error: unknown) {
        throw toForecastResultsServiceError(
          error,
          'Unable to load product forecast detail.',
        );
      }
    },
  };
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
      if (
        value.productResults !== undefined &&
        (!Array.isArray(value.productResults) ||
          !value.productResults.every(isForecastProductResult))
      ) {
        return null;
      }
      return {
        state: 'ready',
        data: value.data,
        ...(value.productResults === undefined
          ? {}
          : { productResults: value.productResults }),
      };
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
    getProductForecastResult: (runId, productId) => {
      const fixture = readForecastResultsE2EFixture();
      if (fixture === null || fixture.state !== 'ready') {
        return Promise.reject(
          new ForecastResultsServiceError(
            'forecast_result_product_not_found',
            'Forecast detail is not available for this product.',
          ),
        );
      }
      const productResult = fixture.productResults?.find(
        (detail) => detail.runId === runId && detail.productId === productId,
      );
      return productResult === undefined
        ? Promise.reject(
            new ForecastResultsServiceError(
              'forecast_result_product_not_found',
              'Forecast detail is not available for this product.',
            ),
          )
        : Promise.resolve(productResult);
    },
  };
}

const isForecastResultsE2ETestMode =
  process.env.NEXT_PUBLIC_FORECAST_RESULTS_E2E_TEST_MODE === 'true';

/** The single Forecast Results service selected for the current frontend build. */
export const forecastResultsService: ForecastResultsService =
  isForecastResultsE2ETestMode
    ? createE2EForecastResultsService()
    : createHttpForecastResultsService();
