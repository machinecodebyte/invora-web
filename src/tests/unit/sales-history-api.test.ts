import { describe, expect, it, vi } from 'vitest';

import {
  createHttpSalesHistoryService,
  createUnavailableSalesHistoryService,
  mapSalesTransactionResponse,
  mapSalesTrendPointResponse,
} from '@/features/sales/api';
import type { SalesHistoryQuery } from '@/features/sales/types';
import { ApiClient } from '@/lib/api-client';

const QUERY: SalesHistoryQuery = {
  search: '  MILK-1  ',
  dateFrom: '2026-03-08',
  dateTo: '2026-03-12',
  source: 'csv_upload',
  limit: 50,
  offset: 50,
  sortBy: 'sale_date',
  sortOrder: 'desc',
};

const TRANSACTION = {
  id: 'sale-1',
  product_id: 'product-1',
  product: { id: 'product-1', name: 'Milk', sku: 'MILK-1' },
  upload_batch_id: 'upload-1',
  sale_date: '2026-03-12',
  quantity: '12.500',
  unit_price: '8.00',
  total_amount: '100.00',
  source: 'csv_upload',
  created_at: '2026-03-12T09:00:00Z',
};

function success(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Sales History service adapters', () => {
  it('maps the authenticated transaction list contract, filters, decimals, and pagination', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        success({ transactions: [TRANSACTION], total: 51, limit: 50, offset: 50 }),
      );
    const service = createHttpSalesHistoryService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        getAccessToken: () => 'access-token',
        fetchImpl,
      }),
    );

    await expect(service.listSalesHistory(QUERY)).resolves.toEqual({
      transactions: [
        {
          id: 'sale-1',
          productId: 'product-1',
          product: { id: 'product-1', name: 'Milk', sku: 'MILK-1' },
          uploadBatchId: 'upload-1',
          saleDate: '2026-03-12',
          quantity: 12.5,
          unitPrice: 8,
          totalAmount: 100,
          source: 'csv_upload',
          createdAt: '2026-03-12T09:00:00Z',
        },
      ],
      total: 51,
      limit: 50,
      offset: 50,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/sales/transactions?search=MILK-1&date_from=2026-03-08&date_to=2026-03-12&source=csv_upload&limit=50&offset=50&sort_by=sale_date&sort_order=desc',
    );
    const headers = fetchImpl.mock.calls[0]?.[1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('omits empty/all filters and maps the backend-owned trends endpoint', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        success({ transactions: [], total: 0, limit: 50, offset: 0 }),
      )
      .mockResolvedValueOnce(
        success({
          trends: [
            {
              period_start: '2026-03-12',
              total_quantity: '12.500',
              total_amount: '100.00',
              transaction_count: 1,
            },
          ],
        }),
      );
    const service = createHttpSalesHistoryService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );
    const unfilteredQuery: SalesHistoryQuery = {
      ...QUERY,
      search: null,
      dateFrom: null,
      dateTo: null,
      source: null,
      offset: 0,
    };

    await expect(service.listSalesHistory(unfilteredQuery)).resolves.toMatchObject({
      total: 0,
      transactions: [],
    });
    await expect(service.getSalesTrend(QUERY, 'week')).resolves.toEqual([
      {
        periodStart: '2026-03-12',
        totalQuantity: 12.5,
        totalAmount: 100,
        transactionCount: 1,
      },
    ]);

    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      'https://api.example.test/api/v1/sales/transactions?limit=50&offset=0&sort_by=sale_date&sort_order=desc',
      'https://api.example.test/api/v1/sales/transactions/trends?date_from=2026-03-08&date_to=2026-03-12&interval=week',
    ]);
  });

  it('preserves backend date-only values without constructing a timezone-shifted Date', () => {
    expect(mapSalesTransactionResponse(TRANSACTION).saleDate).toBe('2026-03-12');
    expect(
      mapSalesTrendPointResponse({
        period_start: '2026-03-08',
        total_quantity: '1.000',
        total_amount: '0.00',
        transaction_count: 1,
      }).periodStart,
    ).toBe('2026-03-08');
  });

  it('keeps the unavailable test seam network-free', async () => {
    const service = createUnavailableSalesHistoryService();
    const unfilteredQuery: SalesHistoryQuery = {
      ...QUERY,
      search: null,
      dateFrom: null,
      dateTo: null,
      source: null,
      offset: 0,
    };

    await expect(service.listSalesHistory(unfilteredQuery)).resolves.toBeNull();
    await expect(service.getSalesTrend(unfilteredQuery, 'day')).resolves.toBeNull();
  });
});
