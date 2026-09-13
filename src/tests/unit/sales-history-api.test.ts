import { describe, expect, it } from 'vitest';

import { createUnavailableSalesHistoryService } from '@/features/sales/api';
import type { SalesHistoryQuery } from '@/features/sales/types';

const QUERY: SalesHistoryQuery = {
  search: null,
  dateFrom: null,
  dateTo: null,
  source: null,
  limit: 50,
  offset: 0,
  sortBy: 'sale_date',
  sortOrder: 'desc',
};

describe('Sales History service boundary', () => {
  it('keeps normal frontend builds network-free and honest before API integration', async () => {
    const service = createUnavailableSalesHistoryService();

    await expect(service.listSalesHistory(QUERY)).resolves.toBeNull();
    await expect(service.getSalesTrend(QUERY)).resolves.toBeNull();
  });
});
