import {
  FORECAST_HORIZONS,
  FORECAST_RUN_STATUSES,
  type ForecastHorizon,
  type ForecastRun,
  type ForecastRunRequest,
  type ForecastRunStatus,
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
