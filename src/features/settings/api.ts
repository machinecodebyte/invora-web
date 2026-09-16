import type {
  ForecastDefaults,
  SafetyStockDefaults,
  SettingsData,
} from '@/features/settings/types';

export type SettingsServiceErrorCode =
  'settings_unavailable' | 'settings_save_unavailable';

/** Safe error that can cross the Settings service and UI boundary. */
export class SettingsServiceError extends Error {
  constructor(
    public readonly code: SettingsServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SettingsServiceError';
  }
}

/**
 * Transport-neutral future integration boundary. The backend persists forecast
 * and inventory categories independently, so the contract does too.
 */
export interface SettingsService {
  getSettings(): Promise<SettingsData>;
  updateForecastDefaults(defaults: ForecastDefaults): Promise<ForecastDefaults>;
  updateSafetyStockDefaults(
    defaults: SafetyStockDefaults,
  ): Promise<SafetyStockDefaults>;
}

/**
 * Honest normal-runtime boundary: no endpoint, storage, or simulated
 * persistence is selected until the frontend-to-backend integration phase.
 */
export function createUnavailableSettingsService(): SettingsService {
  return {
    getSettings: () =>
      Promise.reject(
        new SettingsServiceError('settings_unavailable', 'Unable to load settings.'),
      ),
    updateForecastDefaults: () =>
      Promise.reject(
        new SettingsServiceError(
          'settings_save_unavailable',
          'Unable to save forecast defaults.',
        ),
      ),
    updateSafetyStockDefaults: () =>
      Promise.reject(
        new SettingsServiceError(
          'settings_save_unavailable',
          'Unable to save safety stock defaults.',
        ),
      ),
  };
}

/** The Settings feature's sole normal-runtime service until API integration. */
export const settingsService: SettingsService = createUnavailableSettingsService();
