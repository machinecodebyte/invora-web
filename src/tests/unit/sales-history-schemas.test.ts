import { describe, expect, it } from 'vitest';

import {
  salesHistoryFiltersSchema,
  validateSalesHistoryFilters,
} from '@/features/sales/schemas';

describe('salesHistoryFiltersSchema', () => {
  it('accepts backend-aligned search, source, and inclusive same-day date filters', () => {
    expect(
      salesHistoryFiltersSchema.parse({
        search: ' TEST-SKU-001 ',
        source: 'csv_upload',
        dateFrom: '2026-03-12',
        dateTo: '2026-03-12',
      }),
    ).toEqual({
      search: 'TEST-SKU-001',
      source: 'csv_upload',
      dateFrom: '2026-03-12',
      dateTo: '2026-03-12',
    });
  });

  it('rejects malformed dates and start dates after end dates with safe feedback', () => {
    expect(
      validateSalesHistoryFilters({
        search: '',
        source: 'all',
        dateFrom: '2026-03-12',
        dateTo: '2026-03-08',
      }),
    ).toEqual({
      valid: false,
      message: 'End date must be on or after the start date.',
    });

    expect(
      validateSalesHistoryFilters({
        search: '',
        source: 'all',
        dateFrom: 'March 12, 2026',
        dateTo: '',
      }),
    ).toEqual({ valid: false, message: 'Use a valid calendar date.' });
  });

  it('allows cleared date filters', () => {
    expect(
      validateSalesHistoryFilters({
        search: '',
        source: 'all',
        dateFrom: '',
        dateTo: '',
      }),
    ).toEqual({ valid: true, message: null });
  });
});
