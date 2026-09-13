'use client';

import { useCallback, useRef, useState } from 'react';

import {
  ForecastRunServiceError,
  forecastRunService,
  type ForecastRunService,
} from '@/features/forecasting/api';
import type {
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
