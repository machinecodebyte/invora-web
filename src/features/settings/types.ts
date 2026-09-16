/** Backend-aligned choices exposed by the persisted Forecast Defaults contract. */
export const SETTINGS_FORECAST_HORIZONS = [7, 15, 30] as const;

export type SettingsForecastHorizon = (typeof SETTINGS_FORECAST_HORIZONS)[number];

/** Stored forecast model defaults supported by the Settings backend contract. */
export const SETTINGS_FORECAST_MODELS = ['random_forest', 'baseline'] as const;

export type SettingsForecastModel = (typeof SETTINGS_FORECAST_MODELS)[number];

/** Defaults applied when a future forecast is configured; not a forecast-run request. */
export interface ForecastDefaults {
  readonly defaultHorizonDays: SettingsForecastHorizon;
  readonly minHistoryDays: number;
  readonly defaultModel: SettingsForecastModel;
  readonly autoProcessEnabled: boolean;
}

/**
 * Absolute inventory quantity preserved as normalized decimal text so the form
 * never loses precision before the future backend adapter handles Decimal data.
 */
export interface SafetyStockDefaults {
  readonly defaultSafetyStock: string;
}

/** Settings scope deliberately contains only the two Module 11 categories. */
export interface SettingsData {
  readonly forecastDefaults: ForecastDefaults;
  readonly safetyStockDefaults: SafetyStockDefaults;
}

/** Explicit remote-data state used by the Settings route. */
export type SettingsViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: SettingsData }
  | { readonly status: 'error'; readonly message: string };
