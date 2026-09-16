import { describe, expect, it } from 'vitest';

import {
  forecastDefaultsFormSchema,
  safetyStockDefaultsFormSchema,
  toForecastDefaults,
  toSafetyStockDefaults,
} from '@/features/settings/schemas';

describe('Settings schemas', () => {
  it('accepts only backend-supported forecast defaults and maps native values safely', () => {
    const parsed = forecastDefaultsFormSchema.safeParse({
      defaultHorizonDays: '30',
      minHistoryDays: '365',
      defaultModel: 'random_forest',
      autoProcessEnabled: true,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error('Expected valid forecast defaults.');
    }
    expect(toForecastDefaults(parsed.data)).toEqual({
      defaultHorizonDays: 30,
      minHistoryDays: 365,
      defaultModel: 'random_forest',
      autoProcessEnabled: true,
    });

    expect(
      forecastDefaultsFormSchema.safeParse({
        defaultHorizonDays: '14',
        minHistoryDays: '0',
        defaultModel: 'unsupported',
        autoProcessEnabled: false,
      }).success,
    ).toBe(false);
  });

  it('validates the inclusive 1-to-365-day history window without number coercion', () => {
    expect(
      forecastDefaultsFormSchema.safeParse({
        defaultHorizonDays: '7',
        minHistoryDays: '001',
        defaultModel: 'baseline',
        autoProcessEnabled: false,
      }).success,
    ).toBe(true);

    for (const minHistoryDays of ['', '1.5', '-1', '366', 'not-a-number']) {
      expect(
        forecastDefaultsFormSchema.safeParse({
          defaultHorizonDays: '7',
          minHistoryDays,
          defaultModel: 'baseline',
          autoProcessEnabled: false,
        }).success,
      ).toBe(false);
    }
  });

  it('preserves valid zero and three-decimal safety stock without precision loss', () => {
    const zero = safetyStockDefaultsFormSchema.safeParse({
      defaultSafetyStock: '0.000',
    });
    const maximum = safetyStockDefaultsFormSchema.safeParse({
      defaultSafetyStock: '99999999999.999',
    });

    expect(zero.success).toBe(true);
    expect(maximum.success).toBe(true);
    if (!zero.success) {
      throw new Error('Expected zero safety stock to be valid.');
    }
    expect(toSafetyStockDefaults(zero.data)).toEqual({ defaultSafetyStock: '0.000' });

    for (const defaultSafetyStock of ['-1', '1.2345', '100000000000', 'one']) {
      expect(
        safetyStockDefaultsFormSchema.safeParse({ defaultSafetyStock }).success,
      ).toBe(false);
    }
  });
});
