import { z } from 'zod';

import type { ForecastHorizon, ForecastRunRequest } from '@/features/forecasting/types';

/** Select values are strings in the DOM and normalized at the form boundary. */
const FORECAST_HORIZON_FORM_VALUES = ['7', '15', '30'] as const;

const HORIZON_BY_FORM_VALUE: Readonly<
  Record<(typeof FORECAST_HORIZON_FORM_VALUES)[number], ForecastHorizon>
> = {
  '7': 7,
  '15': 15,
  '30': 30,
};

/** Backend-aligned client validation for the only Forecast Run creation field. */
export const forecastRunFormSchema = z.object({
  horizonDays: z.enum(FORECAST_HORIZON_FORM_VALUES, {
    error: 'Choose a forecast horizon of 7, 15, or 30 days.',
  }),
});

export type ForecastRunFormValues = z.infer<typeof forecastRunFormSchema>;

/** Converts the native select value into the future API request shape. */
export function toForecastRunRequest(
  values: ForecastRunFormValues,
): ForecastRunRequest {
  return { horizonDays: HORIZON_BY_FORM_VALUE[values.horizonDays] };
}
