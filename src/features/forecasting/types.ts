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
  | { readonly status: 'tracking'; readonly run: ForecastRun }
  | { readonly status: 'checking_status'; readonly run: ForecastRun }
  | {
      readonly status: 'status_error';
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
