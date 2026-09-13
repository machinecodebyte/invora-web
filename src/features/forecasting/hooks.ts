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
import type {
  ForecastResultsFilters,
  ForecastResultsViewState,
  ForecastRun,
  ForecastRunRequest,
  ForecastRunViewState,
} from '@/features/forecasting/types';

const GENERIC_START_ERROR = 'Unable to start the forecast run.';
const GENERIC_STATUS_ERROR = 'Unable to refresh forecast run status.';

function toSafeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ForecastRunServiceError ? error.message : fallback;
}

function stateForRun(run: ForecastRun): ForecastRunViewState {
  switch (run.status) {
    case 'pending':
    case 'running':
      return { status: 'tracking', run };
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
 * Forecast Run client orchestration. It does not poll by itself because the
 * backend exposes no progress estimate and its integration policy is deferred.
 * The explicit refresh action exercises the future status boundary safely.
 */
export function useForecastRun(
  service: ForecastRunService = forecastRunService,
): UseForecastRunResult {
  const [state, setState] = useState<ForecastRunViewState>({ status: 'idle' });
  const actionInFlight = useRef(false);

  const reset = useCallback((): void => {
    if (actionInFlight.current) {
      return;
    }
    setState({ status: 'idle' });
  }, []);

  const startForecast = useCallback(
    async (input: ForecastRunRequest): Promise<void> => {
      if (actionInFlight.current) {
        return;
      }

      actionInFlight.current = true;
      setState({ status: 'starting' });
      try {
        const run = await service.startForecast(input);
        setState(stateForRun(run));
      } catch (error: unknown) {
        setState({
          status: 'failed',
          run: null,
          message: toSafeErrorMessage(error, GENERIC_START_ERROR),
        });
      } finally {
        actionInFlight.current = false;
      }
    },
    [service],
  );

  const refreshStatus = useCallback(async (): Promise<void> => {
    if (
      actionInFlight.current ||
      (state.status !== 'tracking' && state.status !== 'status_error')
    ) {
      return;
    }

    const currentRun = state.run;
    actionInFlight.current = true;
    setState({ status: 'checking_status', run: currentRun });
    try {
      const run = await service.getForecastRunStatus(currentRun.id);
      setState(stateForRun(run));
    } catch (error: unknown) {
      setState({
        status: 'status_error',
        run: currentRun,
        message: toSafeErrorMessage(error, GENERIC_STATUS_ERROR),
      });
    } finally {
      actionInFlight.current = false;
    }
  }, [service, state]);

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
  const state =
    !validRunId
      ? resultsInitialState(runId)
      : settledState?.queryKey === queryKey
        ? settledState.state
        : ({ status: 'loading' } as const);

  useEffect(() => {
    let isCurrent = true;

    if (!validRunId) {
      return () => {
        isCurrent = false;
      };
    }

    void service
      .getForecastResults({
        runId,
        search: filters.search === '' ? null : filters.search,
        dateFrom: filters.dateFrom === '' ? null : filters.dateFrom,
        dateTo: filters.dateTo === '' ? null : filters.dateTo,
        limit: FORECAST_RESULTS_PAGE_SIZE,
        offset,
        sortBy: 'forecast_date',
        sortOrder: 'asc',
        chartInterval: 'day',
      })
      .then((data) => {
        if (!isCurrent) {
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
        if (isCurrent) {
          setSettledState({ queryKey, state: toForecastResultsErrorState(error) });
        }
      });

    return () => {
      isCurrent = false;
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
