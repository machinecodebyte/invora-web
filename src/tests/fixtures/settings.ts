import { SettingsServiceError, type SettingsService } from '@/features/settings/api';
import type {
  ForecastDefaults,
  SafetyStockDefaults,
  SettingsData,
} from '@/features/settings/types';

/** Deterministic Module 11 fixture; test-only and never imported by runtime code. */
export const SETTINGS_FIXTURE: SettingsData = {
  forecastDefaults: {
    defaultHorizonDays: 15,
    minHistoryDays: 30,
    defaultModel: 'baseline',
    autoProcessEnabled: false,
  },
  safetyStockDefaults: {
    defaultSafetyStock: '0.000',
  },
};

export interface SettingsTestServiceOptions {
  readonly data?: SettingsData | undefined;
  readonly getSettingsError?: Error | undefined;
  readonly forecastUpdateError?: Error | undefined;
  readonly safetyStockUpdateError?: Error | undefined;
  readonly forecastUpdateResult?: Promise<ForecastDefaults> | undefined;
  readonly safetyStockUpdateResult?: Promise<SafetyStockDefaults> | undefined;
  readonly onForecastUpdate?: ((defaults: ForecastDefaults) => void) | undefined;
  readonly onSafetyStockUpdate?: ((defaults: SafetyStockDefaults) => void) | undefined;
}

/** Deterministic Settings adapter for tests; never selected by production code. */
export function createSettingsTestService(
  options: SettingsTestServiceOptions = {},
): SettingsService {
  const data = options.data ?? SETTINGS_FIXTURE;

  return {
    getSettings: () => {
      if (options.getSettingsError !== undefined) {
        return Promise.reject(options.getSettingsError);
      }
      return Promise.resolve(data);
    },
    updateForecastDefaults: (defaults) => {
      options.onForecastUpdate?.(defaults);
      if (options.forecastUpdateError !== undefined) {
        return Promise.reject(options.forecastUpdateError);
      }
      return options.forecastUpdateResult ?? Promise.resolve(defaults);
    },
    updateSafetyStockDefaults: (defaults) => {
      options.onSafetyStockUpdate?.(defaults);
      if (options.safetyStockUpdateError !== undefined) {
        return Promise.reject(options.safetyStockUpdateError);
      }
      return options.safetyStockUpdateResult ?? Promise.resolve(defaults);
    },
  };
}

/** Safe fixture error for cases where the adapter must behave as unavailable. */
export function unavailableSettingsFixtureError(): SettingsServiceError {
  return new SettingsServiceError(
    'settings_unavailable',
    'Settings are temporarily unavailable.',
  );
}
