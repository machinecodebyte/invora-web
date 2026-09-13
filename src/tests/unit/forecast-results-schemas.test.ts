import { describe, expect, it } from 'vitest';

import {
  forecastResultsFiltersSchema,
  isForecastRunId,
  toForecastResultsFilters,
} from '@/features/forecasting/schemas';

describe('forecastResultsFiltersSchema', () => {
  it('accepts an empty backend-supported filter set', () => {
    const result = forecastResultsFiltersSchema.safeParse({
      search: '',
      dateFrom: '',
      dateTo: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an inverted forecast date range', () => {
    const result = forecastResultsFiltersSchema.safeParse({
      search: 'widget',
      dateFrom: '2026-06-04',
      dateTo: '2026-06-02',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'End date must be on or after the start date.',
      );
    }
  });

  it('trims a validated search term at the query boundary', () => {
    const result = forecastResultsFiltersSchema.parse({
      search: '  BLUE-001  ',
      dateFrom: '',
      dateTo: '',
    });

    expect(toForecastResultsFilters(result)).toEqual({
      search: 'BLUE-001',
      dateFrom: '',
      dateTo: '',
    });
  });
});

describe('isForecastRunId', () => {
  it('accepts UUID run identifiers and rejects untrusted values', () => {
    expect(isForecastRunId('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isForecastRunId('../forecast-results')).toBe(false);
    expect(isForecastRunId('https://malicious.example')).toBe(false);
    expect(isForecastRunId(undefined)).toBe(false);
  });
});
