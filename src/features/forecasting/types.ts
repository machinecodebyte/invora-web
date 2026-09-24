/** Backend-supported forecast horizon choices for a global forecast run. */
export const FORECAST_HORIZONS = [7, 15, 30] as const;

export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

/** Lifecycle values exposed by the Forecast Run backend contract. */
export const FORECAST_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;

export type ForecastRunStatus = (typeof FORECAST_RUN_STATUSES)[number];

/** Durable Background Jobs states returned while a Forecast Run is executing. */
export const FORECAST_JOB_STATUSES = [
  'queued',
  'started',
  'finished',
  'failed',
  'cancelled',
  'retrying',
] as const;

export type ForecastJobStatus = (typeof FORECAST_JOB_STATUSES)[number];

/**
 * Minimal internal projection of the Forecast Run's durable execution job.
 * It is not a general Background Jobs administration model.
 */
export interface ForecastJob {
  readonly id: string;
  readonly runId: string;
  readonly status: ForecastJobStatus;
}

/** Request projection for the future global Forecast Run creation adapter. */
export interface ForecastRunRequest {
  readonly horizonDays: ForecastHorizon;
}

/**
 * Safe public Forecast Run projection. Detailed forecasts, metadata, and model
 * outputs intentionally remain outside Module 7.
 */
export interface ForecastRun {
  readonly id: string;
  readonly horizonDays: ForecastHorizon;
  readonly status: ForecastRunStatus;
  readonly requestedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly failedAt: string | null;
  readonly cancelledAt: string | null;
  readonly failureReason: string | null;
  readonly totalProducts: number;
  readonly totalSalesRecords: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Frontend interaction state. It is deliberately separate from the server's
 * lifecycle status so pending actions and status-refresh failures are never
 * represented by contradictory booleans.
 */
export type ForecastRunViewState =
  | { readonly status: 'idle' }
  | { readonly status: 'starting' }
  | {
      readonly status: 'tracking';
      readonly run: ForecastRun;
      readonly job: ForecastJob;
    }
  | {
      readonly status: 'checking_status';
      readonly run: ForecastRun;
      readonly job: ForecastJob;
    }
  | {
      readonly status: 'status_error';
      readonly run: ForecastRun;
      readonly job: ForecastJob;
      readonly message: string;
    }
  | {
      readonly status: 'queue_error';
      readonly run: ForecastRun;
      readonly message: string;
    }
  | { readonly status: 'completed'; readonly run: ForecastRun }
  | {
      readonly status: 'failed';
      readonly run: ForecastRun | null;
      readonly message: string;
    }
  | { readonly status: 'cancelled'; readonly run: ForecastRun };

/** Safe, backend-supported evaluation metrics attached to a completed run. */
export interface ForecastResultMetrics {
  readonly modelName: string;
  readonly mae: number | null;
  readonly rmse: number | null;
  /** Backend returns MAPE as a percentage, not a ratio. */
  readonly mape: number | null;
  readonly trainingRows: number;
  readonly validationRows: number;
  readonly totalProducts: number;
  readonly fallbackProducts: number;
  readonly createdAt: string;
}

/** Completed-run summary supplied by the future Forecast Results adapter. */
export interface ForecastResultOverview {
  readonly runId: string;
  readonly status: 'completed';
  readonly horizonDays: ForecastHorizon;
  readonly requestedAt: string;
  readonly completedAt: string | null;
  readonly modelName: string | null;
  readonly totalProducts: number;
  readonly totalPredictions: number;
  readonly forecastStartDate: string | null;
  readonly forecastEndDate: string | null;
  readonly totalPredictedDemand: number;
  readonly averagePredictedDemand: number;
  readonly metrics: ForecastResultMetrics | null;
}

/** One daily prediction from the backend's paginated result listing. */
export interface ForecastPrediction {
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly unit: string;
  readonly currentStock: number | null;
  readonly minimumStock: number | null;
  readonly safetyStock: number | null;
  readonly forecastDate: string;
  readonly predictedDemand: number;
  readonly modelName: string;
}

/** Backend pagination projection for forecast prediction rows. */
export interface ForecastPredictionPage {
  readonly predictions: readonly ForecastPrediction[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export const FORECAST_RESULT_CHART_INTERVALS = ['day', 'week', 'month'] as const;

export type ForecastResultChartInterval =
  (typeof FORECAST_RESULT_CHART_INTERVALS)[number];

/** A period in the backend's actual-versus-predicted aggregate. */
export interface ForecastResultChartPoint {
  readonly periodStart: string;
  readonly predictedDemand: number;
  /** Null means the backend has no actual observation for that period. */
  readonly actualQuantity: number | null;
}

export interface ForecastResultChart {
  readonly runId: string;
  readonly horizonDays: ForecastHorizon;
  readonly interval: ForecastResultChartInterval;
  readonly points: readonly ForecastResultChartPoint[];
}

/** One persisted forecast point for the product-level Results detail API. */
export interface ForecastProductResultPoint {
  readonly forecastDate: string;
  readonly predictedDemand: number;
  /** Null means the backend has no actual observation for that forecast date. */
  readonly actualQuantity: number | null;
  readonly modelName: string;
}

/** Safe, read-only projection from the product-specific Forecast Results API. */
export interface ForecastProductResult {
  readonly runId: string;
  readonly horizonDays: ForecastHorizon;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly unit: string;
  readonly currentStock: number | null;
  readonly minimumStock: number | null;
  readonly safetyStock: number | null;
  readonly totalPredictedDemand: number;
  readonly points: readonly ForecastProductResultPoint[];
}

/** User-facing filters supported directly by the backend result list. */
export interface ForecastResultsFilters {
  readonly search: string;
  readonly dateFrom: string;
  readonly dateTo: string;
}

/** Transport-neutral query passed to the future Forecast Results HTTP adapter. */
export interface ForecastResultsQuery {
  readonly runId: string;
  readonly search: string | null;
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
  readonly limit: number;
  readonly offset: number;
  readonly sortBy: 'forecast_date';
  readonly sortOrder: 'asc';
  readonly chartInterval: ForecastResultChartInterval;
}

/** UI state for the on-demand, read-only product Forecast Results dialog. */
export type ForecastProductResultViewState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: ForecastProductResult }
  | { readonly status: 'not_found' }
  | { readonly status: 'error'; readonly message: string };

/** Read model assembled by the result adapter; table and chart fail independently. */
export interface ForecastResultsData {
  readonly overview: ForecastResultOverview;
  readonly predictions: ForecastPredictionPage;
  readonly metrics: ForecastResultMetrics | null;
  readonly chart: ForecastResultChart | null;
  /** Already normalized, safe chart-specific presentation error. */
  readonly chartError?: string | undefined;
}

/** Explicit client state for all Forecast Results route outcomes. */
export type ForecastResultsViewState =
  | { readonly status: 'not_selected' }
  | { readonly status: 'invalid_run' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: ForecastResultsData }
  | { readonly status: 'empty'; readonly data: ForecastResultsData }
  | { readonly status: 'not_ready'; readonly message: string }
  | { readonly status: 'failed_run'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };
