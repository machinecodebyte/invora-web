'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ForecastRunServiceError,
  ForecastResultsServiceError,
  forecastResultsService,
  forecastRunService,
  type ForecastResultsService,
  type ForecastRunService,
} from '@/features/forecasting/api';
import { isForecastRunId } from '@/features/forecasting/schemas';
import { toDisplayMessage } from '@/lib/api-error';
import type {
  ForecastJob,
  ForecastProductResultViewState,
  ForecastResultsFilters,
  ForecastResultsViewState,
  ForecastRun,
  ForecastRunRequest,
  ForecastRunViewState,
} from '@/features/forecasting/types';

const GENERIC_START_ERROR = 'Unable to start the forecast run.';
const GENERIC_STATUS_ERROR = 'Unable to refresh forecast run status.';
const GENERIC_JOB_STATUS_ERROR = 'Unable to refresh forecast processing status.';

/** A modest interval keeps browser polling bounded while durable work runs in RQ. */
export const FORECAST_JOB_POLL_INTERVAL_MS = 3_000;

function isActiveJobStatus(job: ForecastJob): boolean {
  return (
    job.status === 'queued' || job.status === 'started' || job.status === 'retrying'
  );
}

function toSafeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ForecastRunServiceError
    ? error.message
    : toDisplayMessage(error, fallback);
}

function stateForRun(run: ForecastRun, job: ForecastJob): ForecastRunViewState {
  switch (run.status) {
    case 'pending':
    case 'running':
      return { status: 'tracking', run, job };
    case 'completed':
      return { status: 'completed', run };
    case 'failed':
      return { status: 'failed', run, message: 'Forecast run failed.' };
    case 'cancelled':
      return { status: 'cancelled', run };
  }
}

export interface UseForecastRunResult {
  readonly state: ForecastRunViewState;
  readonly startForecast: (input: ForecastRunRequest) => Promise<void>;
  readonly refreshStatus: () => Promise<void>;
  readonly reset: () => void;
}

/**
 * Forecast Run client orchestration. The browser creates a run, enqueues its
 * durable worker job, polls only active job states, then reconciles the
 * authoritative Forecast Run lifecycle when the job becomes terminal.
 */
export function useForecastRun(
  service: ForecastRunService = forecastRunService,
): UseForecastRunResult {
  const [state, setState] = useState<ForecastRunViewState>({ status: 'idle' });
  const actionInFlight = useRef(false);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const pollJobRef = useRef<((run: ForecastRun, job: ForecastJob) => void) | null>(
    null,
  );

  const clearPolling = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseController = useCallback((controller: AbortController): void => {
    if (requestControllerRef.current === controller) {
      requestControllerRef.current = null;
    }
  }, []);

  const schedulePolling = useCallback(
    (run: ForecastRun, job: ForecastJob): void => {
      clearPolling();
      timerRef.current = setTimeout(() => {
        pollJobRef.current?.(run, job);
      }, FORECAST_JOB_POLL_INTERVAL_MS);
    },
    [clearPolling],
  );

  const pollJob = useCallback(
    async (run: ForecastRun, job: ForecastJob): Promise<void> => {
      if (!mountedRef.current || !isActiveJobStatus(job)) {
        return;
      }
      if (actionInFlight.current) {
        schedulePolling(run, job);
        return;
      }

      const controller = new AbortController();
      actionInFlight.current = true;
      requestControllerRef.current = controller;
      try {
        const nextJob = await service.getForecastJobStatus(job.id, {
          signal: controller.signal,
        });
        if (!mountedRef.current || controller.signal.aborted) {
          return;
        }
        if (nextJob.runId !== run.id) {
          throw new ForecastRunServiceError(
            'forecast_job_status_unavailable',
            GENERIC_JOB_STATUS_ERROR,
          );
        }

        if (isActiveJobStatus(nextJob)) {
          setState({ status: 'tracking', run, job: nextJob });
          schedulePolling(run, nextJob);
          return;
        }

        clearPolling();
        const reconciledRun = await service.getForecastRunStatus(run.id, {
          signal: controller.signal,
        });
        if (!mountedRef.current || controller.signal.aborted) {
          return;
        }
        setState(stateForRun(reconciledRun, nextJob));
      } catch (error: unknown) {
        if (mountedRef.current && !controller.signal.aborted) {
          setState({
            status: 'status_error',
            run,
            job,
            message: toSafeErrorMessage(error, GENERIC_JOB_STATUS_ERROR),
          });
        }
      } finally {
        actionInFlight.current = false;
        releaseController(controller);
      }
    },
    [clearPolling, releaseController, schedulePolling, service],
  );

  useEffect(() => {
    pollJobRef.current = (run, job) => {
      void pollJob(run, job);
    };

    return () => {
      pollJobRef.current = null;
    };
  }, [pollJob]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearPolling();
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [clearPolling]);

  const reset = useCallback((): void => {
    if (actionInFlight.current) {
      return;
    }
    clearPolling();
    setState({ status: 'idle' });
  }, [clearPolling]);

  const startForecast = useCallback(
    async (input: ForecastRunRequest): Promise<void> => {
      if (actionInFlight.current) {
        return;
      }

      actionInFlight.current = true;
      setState({ status: 'starting' });
      const controller = new AbortController();
      requestControllerRef.current = controller;
      let createdRun: ForecastRun | null = null;
      try {
        createdRun = await service.startForecast(input, { signal: controller.signal });
        const job = await service.enqueueForecastRun(createdRun.id, {
          signal: controller.signal,
        });
        if (job.runId !== createdRun.id) {
          throw new ForecastRunServiceError(
            'forecast_job_enqueue_failed',
            'Unable to queue the forecast run.',
          );
        }
        if (!mountedRef.current || controller.signal.aborted) {
          return;
        }
        setState({ status: 'tracking', run: createdRun, job });
        if (isActiveJobStatus(job)) {
          schedulePolling(createdRun, job);
        }
      } catch (error: unknown) {
        if (mountedRef.current && !controller.signal.aborted) {
          if (createdRun !== null) {
            setState({
              status: 'queue_error',
              run: createdRun,
              message: toSafeErrorMessage(error, 'Unable to queue the forecast run.'),
            });
          } else {
            setState({
              status: 'failed',
              run: null,
              message: toSafeErrorMessage(error, GENERIC_START_ERROR),
            });
          }
        }
      } finally {
        actionInFlight.current = false;
        releaseController(controller);
      }
    },
    [releaseController, schedulePolling, service],
  );

  const refreshStatus = useCallback(async (): Promise<void> => {
    if (
      actionInFlight.current ||
      (state.status !== 'tracking' && state.status !== 'status_error')
    ) {
      return;
    }

    const currentRun = state.run;
    const currentJob = state.job;
    actionInFlight.current = true;
    setState({ status: 'checking_status', run: currentRun, job: currentJob });
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const run = await service.getForecastRunStatus(currentRun.id, {
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      const nextState = stateForRun(run, currentJob);
      setState(nextState);
      if (nextState.status === 'tracking' && isActiveJobStatus(currentJob)) {
        schedulePolling(run, currentJob);
      } else {
        clearPolling();
      }
    } catch (error: unknown) {
      if (mountedRef.current && !controller.signal.aborted) {
        setState({
          status: 'status_error',
          run: currentRun,
          job: currentJob,
          message: toSafeErrorMessage(error, GENERIC_STATUS_ERROR),
        });
      }
    } finally {
      actionInFlight.current = false;
      releaseController(controller);
    }
  }, [clearPolling, releaseController, schedulePolling, service, state]);

  return { state, startForecast, refreshStatus, reset };
}

const FORECAST_RESULTS_PAGE_SIZE = 50;

export const DEFAULT_FORECAST_RESULTS_FILTERS: ForecastResultsFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
};

function resultsInitialState(runId: string | undefined): ForecastResultsViewState {
  if (runId === undefined || runId === '') {
    return { status: 'not_selected' };
  }
  return isForecastRunId(runId) ? { status: 'loading' } : { status: 'invalid_run' };
}

function toForecastResultsErrorState(error: unknown): ForecastResultsViewState {
  if (error instanceof ForecastResultsServiceError) {
    switch (error.code) {
      case 'forecast_results_not_ready':
        return { status: 'not_ready', message: error.message };
      case 'forecast_run_failed':
        return { status: 'failed_run', message: error.message };
      case 'forecast_results_unavailable':
        return { status: 'error', message: error.message };
    }
  }
  return { status: 'error', message: 'Unable to load Forecast Results.' };
}

export interface UseForecastResultsResult {
  readonly state: ForecastResultsViewState;
  readonly filters: ForecastResultsFilters;
  readonly isValidRunId: boolean;
  readonly setFilters: (filters: ForecastResultsFilters) => void;
  readonly clearFilters: () => void;
  readonly setPageOffset: (offset: number) => void;
  readonly reload: () => void;
}

/**
 * Read-only result coordination. Query state stays local to the feature and
 * no session, token, network path, or ML computation is introduced here.
 */
export function useForecastResults(
  runId: string | undefined,
  service: ForecastResultsService = forecastResultsService,
): UseForecastResultsResult {
  const [filters, setFiltersState] = useState<ForecastResultsFilters>(
    DEFAULT_FORECAST_RESULTS_FILTERS,
  );
  const [offset, setOffset] = useState(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [settledState, setSettledState] = useState<{
    readonly queryKey: string;
    readonly state: ForecastResultsViewState;
  } | null>(null);

  const validRunId = isForecastRunId(runId);
  const queryKey = `${runId ?? ''}|${filters.search}|${filters.dateFrom}|${filters.dateTo}|${offset}|${reloadVersion}`;
  const state = !validRunId
    ? resultsInitialState(runId)
    : settledState?.queryKey === queryKey
      ? settledState.state
      : ({ status: 'loading' } as const);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    if (!validRunId) {
      return () => {
        isCurrent = false;
        controller.abort();
      };
    }

    void service
      .getForecastResults(
        {
          runId,
          search: filters.search === '' ? null : filters.search,
          dateFrom: filters.dateFrom === '' ? null : filters.dateFrom,
          dateTo: filters.dateTo === '' ? null : filters.dateTo,
          limit: FORECAST_RESULTS_PAGE_SIZE,
          offset,
          sortBy: 'forecast_date',
          sortOrder: 'asc',
          chartInterval: 'day',
        },
        { signal: controller.signal },
      )
      .then((data) => {
        if (!isCurrent || controller.signal.aborted) {
          return;
        }
        setSettledState({
          queryKey,
          state:
            data.overview.totalPredictions === 0
              ? { status: 'empty', data }
              : { status: 'ready', data },
        });
      })
      .catch((error: unknown) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({ queryKey, state: toForecastResultsErrorState(error) });
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [filters, offset, queryKey, reloadVersion, runId, service, validRunId]);

  const setFilters = useCallback((nextFilters: ForecastResultsFilters): void => {
    setOffset(0);
    setFiltersState(nextFilters);
  }, []);

  const clearFilters = useCallback((): void => {
    setOffset(0);
    setFiltersState(DEFAULT_FORECAST_RESULTS_FILTERS);
  }, []);

  const setPageOffset = useCallback((nextOffset: number): void => {
    setOffset(Math.max(0, nextOffset));
  }, []);

  const reload = useCallback((): void => {
    setReloadVersion((version) => version + 1);
  }, []);

  return {
    state,
    filters,
    isValidRunId: validRunId,
    setFilters,
    clearFilters,
    setPageOffset,
    reload,
  };
}

function toForecastProductResultErrorState(
  error: unknown,
): ForecastProductResultViewState {
  if (
    error instanceof ForecastResultsServiceError &&
    error.code === 'forecast_result_product_not_found'
  ) {
    return { status: 'not_found' };
  }
  return {
    status: 'error',
    message:
      error instanceof ForecastResultsServiceError
        ? error.message
        : toDisplayMessage(error, 'Unable to load product forecast detail.'),
  };
}

/** On-demand product Forecast Results read with route-safe IDs and cancellation. */
export function useForecastProductResult(
  runId: string,
  productId: string | null,
  service: ForecastResultsService = forecastResultsService,
): ForecastProductResultViewState {
  const queryKey = `${runId}|${productId ?? ''}`;
  const validIds =
    isForecastRunId(runId) && productId !== null && isForecastRunId(productId);
  const [settledState, setSettledState] = useState<{
    readonly queryKey: string;
    readonly state: ForecastProductResultViewState;
  } | null>(null);

  const state = !validIds
    ? ({ status: 'not_found' } as const)
    : settledState?.queryKey === queryKey
      ? settledState.state
      : ({ status: 'loading' } as const);

  useEffect(() => {
    if (!validIds || productId === null) {
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;
    void service
      .getProductForecastResult(runId, productId, { signal: controller.signal })
      .then((data) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({ queryKey, state: { status: 'ready', data } });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({
            queryKey,
            state: toForecastProductResultErrorState(error),
          });
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [productId, queryKey, runId, service, validIds]);

  return state;
}
