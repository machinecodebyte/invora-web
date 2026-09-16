import { z } from 'zod';

import type {
  ForecastDefaults,
  SafetyStockDefaults,
  SettingsForecastHorizon,
} from '@/features/settings/types';

const FORECAST_HORIZON_FORM_VALUES = ['7', '15', '30'] as const;
const FORECAST_MODEL_VALUES = ['random_forest', 'baseline'] as const;
const MAX_SAFETY_STOCK_INTEGER = '99999999999';
const SAFETY_STOCK_PATTERN = /^\d+(?:\.\d{0,3})?$/u;

const HORIZON_BY_FORM_VALUE: Readonly<
  Record<(typeof FORECAST_HORIZON_FORM_VALUES)[number], SettingsForecastHorizon>
> = {
  '7': 7,
  '15': 15,
  '30': 30,
};

function isHistoryWindow(value: string): boolean {
  if (!/^\d+$/u.test(value)) {
    return false;
  }

  const days = Number(value);
  return Number.isSafeInteger(days) && days >= 1 && days <= 365;
}

/** Form values remain strings until valid native controls are normalized. */
export const forecastDefaultsFormSchema = z.object({
  defaultHorizonDays: z.enum(FORECAST_HORIZON_FORM_VALUES, {
    error: 'Choose a forecast horizon of 7, 15, or 30 days.',
  }),
  minHistoryDays: z
    .string()
    .trim()
    .refine(isHistoryWindow, 'Enter a whole number from 1 to 365 days.'),
  defaultModel: z.enum(FORECAST_MODEL_VALUES, {
    error: 'Choose a supported default forecast model.',
  }),
  autoProcessEnabled: z.boolean(),
});

export type ForecastDefaultsFormValues = z.infer<typeof forecastDefaultsFormSchema>;

function normalizeSafetyStock(value: string): string {
  const [integerPart, fractionalPart] = value.trim().split('.', 2);
  const normalizedInteger = integerPart?.replace(/^0+(?=\d)/u, '') || '0';

  return fractionalPart === undefined || fractionalPart === ''
    ? normalizedInteger
    : `${normalizedInteger}.${fractionalPart}`;
}

function isWithinSafetyStockLimit(value: string): boolean {
  const [integerPart] = normalizeSafetyStock(value).split('.', 1);
  if (integerPart === undefined) {
    return false;
  }

  return (
    integerPart.length < MAX_SAFETY_STOCK_INTEGER.length ||
    (integerPart.length === MAX_SAFETY_STOCK_INTEGER.length &&
      integerPart <= MAX_SAFETY_STOCK_INTEGER)
  );
}

/** Backend-aligned absolute Decimal validation: zero through 99,999,999,999.999. */
export const safetyStockDefaultsFormSchema = z.object({
  defaultSafetyStock: z
    .string()
    .trim()
    .min(1, 'Default safety stock is required.')
    .refine(
      (value) => SAFETY_STOCK_PATTERN.test(value),
      'Enter a non-negative quantity with up to 3 decimal places.',
    )
    .refine(
      isWithinSafetyStockLimit,
      'Default safety stock must be 99,999,999,999.999 or less.',
    ),
});

export type SafetyStockDefaultsFormValues = z.infer<
  typeof safetyStockDefaultsFormSchema
>;

/** Maps a loaded forecast category into native form fields. */
export function toForecastDefaultsFormValues(
  defaults: ForecastDefaults,
): ForecastDefaultsFormValues {
  return {
    defaultHorizonDays: String(
      defaults.defaultHorizonDays,
    ) as ForecastDefaultsFormValues['defaultHorizonDays'],
    minHistoryDays: String(defaults.minHistoryDays),
    defaultModel: defaults.defaultModel,
    autoProcessEnabled: defaults.autoProcessEnabled,
  };
}

/** Maps validated native values to the transport-neutral Settings projection. */
export function toForecastDefaults(
  values: ForecastDefaultsFormValues,
): ForecastDefaults {
  return {
    defaultHorizonDays: HORIZON_BY_FORM_VALUE[values.defaultHorizonDays],
    minHistoryDays: Number(values.minHistoryDays.trim()),
    defaultModel: values.defaultModel,
    autoProcessEnabled: values.autoProcessEnabled,
  };
}

/** Maps a loaded Decimal value to its text input representation. */
export function toSafetyStockDefaultsFormValues(
  defaults: SafetyStockDefaults,
): SafetyStockDefaultsFormValues {
  return { defaultSafetyStock: defaults.defaultSafetyStock };
}

/** Normalizes validated decimal text without coercing it through JavaScript Number. */
export function toSafetyStockDefaults(
  values: SafetyStockDefaultsFormValues,
): SafetyStockDefaults {
  return { defaultSafetyStock: normalizeSafetyStock(values.defaultSafetyStock) };
}
