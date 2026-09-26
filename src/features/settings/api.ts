import {
  SETTINGS_FORECAST_HORIZONS,
  SETTINGS_FORECAST_MODELS,
} from '@/features/settings/types';
import type {
  ForecastDefaults,
  SafetyStockDefaults,
  SettingsData,
  SettingsForecastHorizon,
  SettingsForecastModel,
} from '@/features/settings/types';
import { apiClient, type RequestConfig } from '@/lib/api-client';

export type SettingsServiceErrorCode =
  'settings_unavailable' | 'settings_save_unavailable';

const MAX_SAFETY_STOCK_INTEGER = '99999999999';
const SAFETY_STOCK_WIRE_PATTERN = /^\d+(?:\.\d{1,3})?$/u;

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
 * Settings UI persistence contract. The server keeps Forecast and Inventory
 * preferences in separate categories, so the frontend preserves that boundary.
 */
export interface SettingsService {
  getSettings(): Promise<SettingsData>;
  updateForecastDefaults(defaults: ForecastDefaults): Promise<ForecastDefaults>;
  updateSafetyStockDefaults(
    defaults: SafetyStockDefaults,
  ): Promise<SafetyStockDefaults>;
}

/** Minimal authenticated transport surface used by the Settings HTTP adapter. */
export interface SettingsApiClient {
  get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse>;
  patch<TResponse>(
    path: string,
    body?: Record<string, unknown>,
    config?: RequestConfig,
  ): Promise<TResponse>;
}

type ForecastSettingsWire = {
  readonly forecast_default_horizon_days: SettingsForecastHorizon;
  readonly forecast_min_history_days: number;
  readonly forecast_default_model: SettingsForecastModel;
  readonly forecast_auto_process_enabled: boolean;
};

type DecimalWireValue = number | string;

type InventorySettingsWire = {
  readonly inventory_default_minimum_stock: DecimalWireValue;
  readonly inventory_default_safety_stock: DecimalWireValue;
  readonly inventory_low_stock_alert_enabled: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isForecastHorizon(value: unknown): value is SettingsForecastHorizon {
  return (
    typeof value === 'number' &&
    SETTINGS_FORECAST_HORIZONS.includes(value as SettingsForecastHorizon)
  );
}

function isForecastModel(value: unknown): value is SettingsForecastModel {
  return (
    typeof value === 'string' &&
    SETTINGS_FORECAST_MODELS.includes(value as SettingsForecastModel)
  );
}

function isHistoryDays(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365
  );
}

function isSafetyStockText(value: string): boolean {
  if (!SAFETY_STOCK_WIRE_PATTERN.test(value)) {
    return false;
  }

  const normalizedInteger = value.split('.', 1)[0]?.replace(/^0+(?=\d)/u, '') || '0';
  return (
    normalizedInteger.length < MAX_SAFETY_STOCK_INTEGER.length ||
    (normalizedInteger.length === MAX_SAFETY_STOCK_INTEGER.length &&
      normalizedInteger <= MAX_SAFETY_STOCK_INTEGER)
  );
}

function toSafetyStockText(value: DecimalWireValue): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    const text = String(value);
    return isSafetyStockText(text) ? text : null;
  }

  return isSafetyStockText(value) ? value : null;
}

function isForecastSettingsWire(value: unknown): value is ForecastSettingsWire {
  return (
    isRecord(value) &&
    isForecastHorizon(value.forecast_default_horizon_days) &&
    isHistoryDays(value.forecast_min_history_days) &&
    isForecastModel(value.forecast_default_model) &&
    typeof value.forecast_auto_process_enabled === 'boolean'
  );
}

function isInventorySettingsWire(value: unknown): value is InventorySettingsWire {
  return (
    isRecord(value) &&
    (typeof value.inventory_default_minimum_stock === 'string' ||
      typeof value.inventory_default_minimum_stock === 'number') &&
    (typeof value.inventory_default_safety_stock === 'string' ||
      typeof value.inventory_default_safety_stock === 'number') &&
    typeof value.inventory_low_stock_alert_enabled === 'boolean'
  );
}

function unexpectedSettingsResponse(): SettingsServiceError {
  return new SettingsServiceError('settings_unavailable', 'Unable to load settings.');
}

function settingsError(
  error: unknown,
  code: SettingsServiceErrorCode,
  message: string,
): SettingsServiceError {
  return error instanceof SettingsServiceError && error.code === code
    ? error
    : new SettingsServiceError(code, message);
}

/** Maps the verified `/settings/forecast` payload to the current UI model. */
export function mapForecastSettingsResponse(value: unknown): ForecastDefaults {
  if (!isForecastSettingsWire(value)) {
    throw unexpectedSettingsResponse();
  }

  return {
    defaultHorizonDays: value.forecast_default_horizon_days,
    minHistoryDays: value.forecast_min_history_days,
    defaultModel: value.forecast_default_model,
    autoProcessEnabled: value.forecast_auto_process_enabled,
  };
}

/**
 * Maps only the Safety Stock slice owned by the current frontend UI. Inventory
 * minimum-stock and low-stock-alert values are verified as response fields but
 * intentionally never become frontend state or PATCH input in this phase.
 */
export function mapInventorySettingsResponse(value: unknown): SafetyStockDefaults {
  if (!isInventorySettingsWire(value)) {
    throw unexpectedSettingsResponse();
  }

  const safetyStock = toSafetyStockText(value.inventory_default_safety_stock);
  if (safetyStock === null) {
    throw unexpectedSettingsResponse();
  }

  return { defaultSafetyStock: safetyStock };
}

/** Maps the existing Forecast Defaults form model to the category PATCH body. */
export function toForecastSettingsUpdate(
  defaults: ForecastDefaults,
): Record<string, unknown> {
  return {
    forecast_default_horizon_days: defaults.defaultHorizonDays,
    forecast_min_history_days: defaults.minHistoryDays,
    forecast_default_model: defaults.defaultModel,
    forecast_auto_process_enabled: defaults.autoProcessEnabled,
  };
}

/**
 * Sends only the UI-owned Inventory field. Omitting the other category fields
 * lets FastAPI preserve them during the backend's partial PATCH update.
 */
export function toInventorySettingsUpdate(
  defaults: SafetyStockDefaults,
): Record<string, unknown> {
  return { inventory_default_safety_stock: defaults.defaultSafetyStock };
}

/**
 * Real authenticated Settings adapter. It composes the two existing UI
 * categories in parallel and never reads/writes browser persistence.
 */
export function createHttpSettingsService(
  client: SettingsApiClient = apiClient,
): SettingsService {
  return {
    async getSettings() {
      try {
        const [forecast, inventory] = await Promise.all([
          client.get<unknown>('/api/v1/settings/forecast'),
          client.get<unknown>('/api/v1/settings/inventory'),
        ]);
        return {
          forecastDefaults: mapForecastSettingsResponse(forecast),
          safetyStockDefaults: mapInventorySettingsResponse(inventory),
        };
      } catch (error: unknown) {
        throw settingsError(error, 'settings_unavailable', 'Unable to load settings.');
      }
    },
    async updateForecastDefaults(defaults) {
      try {
        const data = await client.patch<unknown>(
          '/api/v1/settings/forecast',
          toForecastSettingsUpdate(defaults),
        );
        return mapForecastSettingsResponse(data);
      } catch (error: unknown) {
        throw settingsError(
          error,
          'settings_save_unavailable',
          'Unable to save forecast defaults.',
        );
      }
    },
    async updateSafetyStockDefaults(defaults) {
      try {
        const data = await client.patch<unknown>(
          '/api/v1/settings/inventory',
          toInventorySettingsUpdate(defaults),
        );
        return mapInventorySettingsResponse(data);
      } catch (error: unknown) {
        throw settingsError(
          error,
          'settings_save_unavailable',
          'Unable to save safety stock defaults.',
        );
      }
    },
  };
}

/** Test-only unavailable seam retained for focused failure-state coverage. */
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

/** Storage key read only by the Playwright-only Settings adapter below. */
export const SETTINGS_E2E_STORAGE_KEY = 'invora-e2e-settings-fixture';

export type SettingsE2EFixture =
  | { readonly state: 'ready'; readonly data: SettingsData }
  | { readonly state: 'error' };

function isSettingsData(value: unknown): value is SettingsData {
  if (
    !isRecord(value) ||
    !isRecord(value.forecastDefaults) ||
    !isRecord(value.safetyStockDefaults)
  ) {
    return false;
  }

  return (
    isForecastHorizon(value.forecastDefaults.defaultHorizonDays) &&
    isHistoryDays(value.forecastDefaults.minHistoryDays) &&
    isForecastModel(value.forecastDefaults.defaultModel) &&
    typeof value.forecastDefaults.autoProcessEnabled === 'boolean' &&
    typeof value.safetyStockDefaults.defaultSafetyStock === 'string' &&
    isSafetyStockText(value.safetyStockDefaults.defaultSafetyStock)
  );
}

function isSettingsE2EFixture(value: unknown): value is SettingsE2EFixture {
  return (
    isRecord(value) &&
    (value.state === 'error' || (value.state === 'ready' && isSettingsData(value.data)))
  );
}

function readE2EFixture(): SettingsE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'error' };
  }

  const encodedFixture = window.sessionStorage.getItem(SETTINGS_E2E_STORAGE_KEY);
  if (encodedFixture === null) {
    return { state: 'error' };
  }

  try {
    const fixture: unknown = JSON.parse(encodedFixture);
    return isSettingsE2EFixture(fixture) ? fixture : { state: 'error' };
  } catch {
    return { state: 'error' };
  }
}

function writeE2EFixture(fixture: SettingsE2EFixture): void {
  window.sessionStorage.setItem(SETTINGS_E2E_STORAGE_KEY, JSON.stringify(fixture));
}

function e2EError(
  code: SettingsServiceErrorCode,
  message: string,
): SettingsServiceError {
  return new SettingsServiceError(code, message);
}

/** Deterministic adapter selected only by Playwright's explicit build flag. */
export function createE2ESettingsService(): SettingsService {
  return {
    getSettings() {
      const fixture = readE2EFixture();
      return fixture.state === 'ready'
        ? Promise.resolve(fixture.data)
        : Promise.reject(e2EError('settings_unavailable', 'Unable to load settings.'));
    },
    updateForecastDefaults(defaults) {
      const fixture = readE2EFixture();
      if (fixture.state !== 'ready') {
        return Promise.reject(
          e2EError('settings_save_unavailable', 'Unable to save forecast defaults.'),
        );
      }
      writeE2EFixture({
        state: 'ready',
        data: { ...fixture.data, forecastDefaults: defaults },
      });
      return Promise.resolve(defaults);
    },
    updateSafetyStockDefaults(defaults) {
      const fixture = readE2EFixture();
      if (fixture.state !== 'ready') {
        return Promise.reject(
          e2EError(
            'settings_save_unavailable',
            'Unable to save safety stock defaults.',
          ),
        );
      }
      writeE2EFixture({
        state: 'ready',
        data: { ...fixture.data, safetyStockDefaults: defaults },
      });
      return Promise.resolve(defaults);
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_SETTINGS_E2E_TEST_MODE === 'true';

/** The single Settings service selected for the current frontend build. */
export const settingsService: SettingsService = isE2ETestMode
  ? createE2ESettingsService()
  : createHttpSettingsService();
