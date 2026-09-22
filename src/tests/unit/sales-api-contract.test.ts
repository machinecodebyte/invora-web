import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import {
  createHttpSalesHistoryService,
  createHttpSalesUploadService,
} from '@/features/sales/api';
import { ApiClient } from '@/lib/api-client';
import { TEST_API_BASE_URL } from '@/tests/mocks/handlers';
import { server } from '@/tests/mocks/server';
import { createSalesCsvFile } from '@/tests/fixtures/sales-upload';

const QUERY = {
  search: 'SKU-1',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-23',
  source: 'csv_upload' as const,
  limit: 50,
  offset: 0,
  sortBy: 'sale_date' as const,
  sortOrder: 'desc' as const,
};

function client(): ApiClient {
  return new ApiClient({
    baseUrl: TEST_API_BASE_URL,
    getAccessToken: () => 'test-access-token',
  });
}

describe('Sales FastAPI contract handlers', () => {
  it('uses POST /sales/uploads with the exact multipart file field and success envelope', async () => {
    server.use(
      http.post(`${TEST_API_BASE_URL}/api/v1/sales/uploads`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer test-access-token');
        expect(request.headers.get('content-type')).toMatch(
          /^multipart\/form-data; boundary=/u,
        );
        return HttpResponse.json(
          {
            success: true,
            data: {
              upload: {
                id: 'upload-1',
                original_filename: 'sales.csv',
                status: 'completed',
                total_rows: 1,
                accepted_rows: 1,
                rejected_rows: 0,
                started_at: '2026-09-23T10:00:00Z',
                completed_at: '2026-09-23T10:00:01Z',
                failure_reason: null,
              },
            },
          },
          { status: 201 },
        );
      }),
    );

    const service = createHttpSalesUploadService(client());
    await expect(
      service.uploadSalesCsv(createSalesCsvFile(), () => undefined),
    ).resolves.toMatchObject({
      result: { acceptedRows: 1, rejectedRows: 0 },
      rowErrors: [],
    });
  });

  it('uses the real list and trends paths with exact query names and maps envelopes', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/sales/transactions`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('search')).toBe('SKU-1');
        expect(url.searchParams.get('date_from')).toBe('2026-09-01');
        expect(url.searchParams.get('date_to')).toBe('2026-09-23');
        expect(url.searchParams.get('source')).toBe('csv_upload');
        expect(url.searchParams.get('limit')).toBe('50');
        expect(url.searchParams.get('offset')).toBe('0');
        expect(url.searchParams.get('sort_by')).toBe('sale_date');
        expect(url.searchParams.get('sort_order')).toBe('desc');
        return HttpResponse.json({
          success: true,
          data: {
            transactions: [
              {
                id: 'sale-1',
                product_id: 'product-1',
                product: { id: 'product-1', name: 'Product', sku: 'SKU-1' },
                upload_batch_id: 'upload-1',
                sale_date: '2026-09-23',
                quantity: '3.000',
                unit_price: null,
                total_amount: null,
                source: 'csv_upload',
                created_at: '2026-09-23T10:00:00Z',
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          },
        });
      }),
      http.get(
        `${TEST_API_BASE_URL}/api/v1/sales/transactions/trends`,
        ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('date_from')).toBe('2026-09-01');
          expect(url.searchParams.get('date_to')).toBe('2026-09-23');
          expect(url.searchParams.get('interval')).toBe('day');
          return HttpResponse.json({
            success: true,
            data: {
              trends: [
                {
                  period_start: '2026-09-23',
                  total_quantity: '3.000',
                  total_amount: '0.00',
                  transaction_count: 1,
                },
              ],
            },
          });
        },
      ),
    );

    const service = createHttpSalesHistoryService(client());
    await expect(service.listSalesHistory(QUERY)).resolves.toMatchObject({
      total: 1,
      transactions: [{ saleDate: '2026-09-23', quantity: 3 }],
    });
    await expect(service.getSalesTrend(QUERY, 'day')).resolves.toEqual([
      {
        periodStart: '2026-09-23',
        totalQuantity: 3,
        totalAmount: 0,
        transactionCount: 1,
      },
    ]);
  });
});
