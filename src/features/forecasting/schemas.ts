import { z } from 'zod';

import type { ForecastHorizon, ForecastRunRequest } from '@/features/forecasting/types';
import type { ForecastResultsFilters } from '@/features/forecasting/types';

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

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Backend-compatible optional filters for the Forecast Results list. */
export const forecastResultsFiltersSchema = z
  .object({
    search: z.string().trim().max(255, 'Search must be 255 characters or fewer.'),
    dateFrom: z
      .string()
      .refine(
        (value) => value === '' || DATE_ONLY_PATTERN.test(value),
        'Enter a valid start date.',
      ),
    dateTo: z
      .string()
      .refine(
        (value) => value === '' || DATE_ONLY_PATTERN.test(value),
        'Enter a valid end date.',
      ),
  })
  .superRefine((values, context) => {
    if (
      values.dateFrom !== '' &&
      values.dateTo !== '' &&
      values.dateFrom > values.dateTo
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'End date must be on or after the start date.',
      });
    }
  });

export type ForecastResultsFilterValues = z.infer<typeof forecastResultsFiltersSchema>;

/** Convert validated filter form values to the canonical query state. */
export function toForecastResultsFilters(
  values: ForecastResultsFilterValues,
): ForecastResultsFilters {
  return {
    search: values.search.trim(),
    dateFrom: values.dateFrom,
    dateTo: values.dateTo,
  };
}

/** A run id comes from an untrusted route query, so validate it before use. */
export function isForecastRunId(value: string | undefined): value is string {
  return (
    value !== undefined &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
