import { describe, expect, it } from 'vitest';

import {
  forecastRunFormSchema,
  toForecastRunRequest,
} from '@/features/forecasting/schemas';

describe('forecastRunFormSchema', () => {
  it('accepts every backend-supported horizon and normalizes its request shape', () => {
    for (const [value, horizonDays] of [
      ['7', 7],
      ['15', 15],
      ['30', 30],
    ] as const) {
      const result = forecastRunFormSchema.safeParse({ horizonDays: value });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(toForecastRunRequest(result.data)).toEqual({ horizonDays });
      }
    }
  });

  it('rejects a missing or unsupported horizon before a future request', () => {
    expect(forecastRunFormSchema.safeParse({ horizonDays: '' }).success).toBe(false);
    expect(forecastRunFormSchema.safeParse({ horizonDays: '14' }).success).toBe(false);
    expect(forecastRunFormSchema.safeParse({}).success).toBe(false);
  });
});
