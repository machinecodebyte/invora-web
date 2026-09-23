import {
  ForecastRunServiceError,
  type ForecastRunService,
} from '@/features/forecasting/api';
import type {
  ForecastJob,
  ForecastRun,
  ForecastRunRequest,
} from '@/features/forecasting/types';

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

export const FORECAST_JOB_QUEUED: ForecastJob = {
  id: 'test-forecast-job-001',
  runId: FORECAST_RUN_PENDING.id,
  status: 'queued',
};

export const FORECAST_JOB_SEQUENCE: readonly ForecastJob[] = [
  FORECAST_JOB_QUEUED,
  { ...FORECAST_JOB_QUEUED, status: 'started' },
  { ...FORECAST_JOB_QUEUED, status: 'finished' },
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

export const FORECAST_JOB_FAILED_SEQUENCE: readonly ForecastJob[] = [
  {
    ...FORECAST_JOB_QUEUED,
    id: 'test-forecast-job-002',
    runId: FORECAST_RUN_FAILED_SEQUENCE[0]!.id,
  },
  {
    ...FORECAST_JOB_QUEUED,
    id: 'test-forecast-job-002',
    runId: FORECAST_RUN_FAILED_SEQUENCE[0]!.id,
    status: 'failed',
  },
];

export interface ForecastRunTestServiceOptions {
  readonly runs?: readonly ForecastRun[] | undefined;
  readonly jobs?: readonly ForecastJob[] | undefined;
  readonly startError?: Error | undefined;
  readonly enqueueError?: Error | undefined;
  readonly statusError?: Error | undefined;
  readonly jobStatusError?: Error | undefined;
}

/** Deterministic adapter used only by Module 7 component tests. */
export function createForecastRunTestService(
  options: ForecastRunTestServiceOptions = {},
): ForecastRunService {
  const runs = options.runs ?? FORECAST_RUN_SEQUENCE;
  const jobs =
    options.jobs ??
    (runs[0]?.id === FORECAST_RUN_FAILED_SEQUENCE[0]?.id
      ? FORECAST_JOB_FAILED_SEQUENCE
      : FORECAST_JOB_SEQUENCE);
  let index = 0;
  let jobIndex = 0;

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
    enqueueForecastRun: (runId: string) => {
      if (options.enqueueError !== undefined) {
        return Promise.reject(options.enqueueError);
      }
      const initialJob = jobs[0];
      if (
        initialJob === undefined ||
        initialJob.runId !== runId ||
        runs[0]?.id !== runId
      ) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_job_enqueue_failed',
            'Unable to queue the forecast run.',
          ),
        );
      }
      jobIndex = 0;
      return Promise.resolve(initialJob);
    },
    getForecastJobStatus: (jobId: string) => {
      if (options.jobStatusError !== undefined) {
        return Promise.reject(options.jobStatusError);
      }
      const current = jobs[jobIndex];
      if (current === undefined || current.id !== jobId) {
        return Promise.reject(
          new ForecastRunServiceError(
            'forecast_job_status_unavailable',
            'Unable to refresh forecast processing status.',
          ),
        );
      }
      jobIndex = Math.min(jobIndex + 1, jobs.length - 1);
      return Promise.resolve(jobs[jobIndex]!);
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
