'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  SettingsServiceError,
  settingsService,
  type SettingsService,
} from '@/features/settings/api';
import type {
  ForecastDefaults,
  SafetyStockDefaults,
  SettingsViewState,
} from '@/features/settings/types';

const GENERIC_LOAD_ERROR = 'Unable to load settings.';
const GENERIC_FORECAST_SAVE_ERROR = 'Unable to save forecast defaults.';
const GENERIC_SAFETY_STOCK_SAVE_ERROR = 'Unable to save safety stock defaults.';

function safeError(
  error: unknown,
  code: SettingsServiceError['code'],
  fallback: string,
): SettingsServiceError {
  return error instanceof SettingsServiceError
    ? error
    : new SettingsServiceError(code, fallback);
}

export interface UseSettingsResult {
  readonly state: SettingsViewState;
  readonly reload: () => void;
  readonly updateForecastDefaults: (
    defaults: ForecastDefaults,
  ) => Promise<ForecastDefaults>;
  readonly updateSafetyStockDefaults: (
    defaults: SafetyStockDefaults,
  ) => Promise<SafetyStockDefaults>;
}

/** Local Settings orchestration; persistence stays behind the injected service. */
export function useSettings(
  service: SettingsService = settingsService,
): UseSettingsResult {
  const [state, setState] = useState<SettingsViewState>({ status: 'loading' });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    void service
      .getSettings()
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: safeError(error, 'settings_unavailable', GENERIC_LOAD_ERROR)
              .message,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [requestVersion, service]);

  const reload = useCallback((): void => {
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, []);

  const updateForecastDefaults = useCallback(
    async (defaults: ForecastDefaults): Promise<ForecastDefaults> => {
      try {
        const updated = await service.updateForecastDefaults(defaults);
        setState((current) =>
          current.status === 'ready'
            ? {
                status: 'ready',
                data: { ...current.data, forecastDefaults: updated },
              }
            : current,
        );
        return updated;
      } catch (error: unknown) {
        throw safeError(
          error,
          'settings_save_unavailable',
          GENERIC_FORECAST_SAVE_ERROR,
        );
      }
    },
    [service],
  );

  const updateSafetyStockDefaults = useCallback(
    async (defaults: SafetyStockDefaults): Promise<SafetyStockDefaults> => {
      try {
        const updated = await service.updateSafetyStockDefaults(defaults);
        setState((current) =>
          current.status === 'ready'
            ? {
                status: 'ready',
                data: { ...current.data, safetyStockDefaults: updated },
              }
            : current,
        );
        return updated;
      } catch (error: unknown) {
        throw safeError(
          error,
          'settings_save_unavailable',
          GENERIC_SAFETY_STOCK_SAVE_ERROR,
        );
      }
    },
    [service],
  );

  return {
    state,
    reload,
    updateForecastDefaults,
    updateSafetyStockDefaults,
  };
}
