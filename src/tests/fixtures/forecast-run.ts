import {
  ForecastRunServiceError,
  type ForecastRunService,
} from '@/features/forecasting/api';
import type { ForecastRun, ForecastRunRequest } from '@/features/forecasting/types';

const BASE_RUN: Omit<
  ForecastRun,
  'horizonDays' | 'status' | 'startedAt' | 'completedAt' | 'failedAt' | 'failureReason'
> = {
  id: 'test-forecast-run-001',
  requestedAt: '2026-03-13T09:00:00Z',
  cancelledAt: null,
  totalProducts: 4,
  totalSalesRecords: 240,
  createdAt: '2026-03-13T09:00:00Z',
  updatedAt: '2026-03-13T09:00:00Z',
};

export const FORECAST_RUN_PENDING: ForecastRun = {
  ...BASE_RUN,
  horizonDays: 15,
  status: 'pending',
  startedAt: null,
  completedAt: null,
  failedAt: null,
  failureReason: null,
};

export const FORECAST_RUN_RUNNING: ForecastRun = {
  ...FORECAST_RUN_PENDING,
  status: 'running',
  startedAt: '2026-03-13T09:00:05Z',
  updatedAt: '2026-03-13T09:00:05Z',
};

export const FORECAST_RUN_COMPLETED: ForecastRun = {
  ...FORECAST_RUN_RUNNING,
  status: 'completed',
  completedAt: '2026-03-13T09:01:05Z',
  updatedAt: '2026-03-13T09:01:05Z',
};

export const FORECAST_RUN_SEQUENCE: readonly ForecastRun[] = [
  FORECAST_RUN_PENDING,
  FORECAST_RUN_RUNNING,
  FORECAST_RUN_COMPLETED,
];

export const FORECAST_RUN_FAILED_SEQUENCE: readonly ForecastRun[] = [
  {
    ...FORECAST_RUN_PENDING,
    id: 'test-forecast-run-002',
    horizonDays: 7,
  },
  {
    ...FORECAST_RUN_PENDING,
    id: 'test-forecast-run-002',
    horizonDays: 7,
    status: 'failed',
    startedAt: '2026-03-13T09:00:05Z',
    failedAt: '2026-03-13T09:00:12Z',
    failureReason: 'test-only internal execution detail',
    updatedAt: '2026-03-13T09:00:12Z',
  },
];

export interface ForecastRunTestServiceOptions {
  readonly runs?: readonly ForecastRun[] | undefined;
  readonly startError?: Error | undefined;
  readonly statusError?: Error | undefined;
}

/** Deterministic adapter used only by Module 7 component tests. */
export function createForecastRunTestService(
  options: ForecastRunTestServiceOptions = {},
): ForecastRunService {
  const runs = options.runs ?? FORECAST_RUN_SEQUENCE;
  let index = 0;

  return {
    startForecast: (input: ForecastRunRequest) => {
      if (options.startError !== undefined) {
        return Promise.reject(options.startError);
      }
      const initial = runs[0];
      if (initial === undefined || initial.horizonDays !== input.horizonDays) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_runs_unavailable',
            'Unable to start the forecast run.',
          ),
        );
      }
      index = 0;
      return Promise.resolve(initial);
    },
    getForecastRunStatus: (runId: string) => {
      if (options.statusError !== undefined) {
        return Promise.reject(options.statusError);
      }
      const current = runs[index];
      if (current === undefined || current.id !== runId) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_run_status_unavailable',
            'Unable to refresh forecast run status.',
          ),
        );
      }
      index = Math.min(index + 1, runs.length - 1);
      return Promise.resolve(runs[index]!);
    },
  };
}
