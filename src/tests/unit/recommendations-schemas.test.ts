import { describe, expect, it } from 'vitest';

import { recommendationFiltersSchema } from '@/features/recommendations/schemas';

describe('recommendationFiltersSchema', () => {
  it('accepts every backend-supported risk and status level', () => {
    for (const riskLevel of ['all', 'low', 'medium', 'high', 'critical', 'overstocked']) {
      for (const status of ['all', 'open', 'acknowledged', 'dismissed']) {
        expect(
          recommendationFiltersSchema.safeParse({ search: 'TEST', riskLevel, status }).success,
        ).toBe(true);
      }
    }
  });

  it('rejects unsupported risk values and oversized search input', () => {
    expect(
      recommendationFiltersSchema.safeParse({ search: '', riskLevel: 'urgent', status: 'all' }).success,
    ).toBe(false);
    expect(
      recommendationFiltersSchema.safeParse({ search: 'x'.repeat(256), riskLevel: 'all', status: 'all' }).success,
    ).toBe(false);
    expect(
      recommendationFiltersSchema.safeParse({ search: '', riskLevel: 'all', status: 'pending' }).success,
    ).toBe(false);
  });
});
