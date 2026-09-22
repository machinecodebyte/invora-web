import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SALES_UPLOAD_E2E_STORAGE_KEY,
  SalesUploadServiceError,
  createE2ESalesUploadService,
  createHttpSalesUploadService,
  createUnavailableSalesUploadService,
} from '@/features/sales/api';
import { ApiClient } from '@/lib/api-client';
import {
  SALES_UPLOAD_ROW_ERROR_SUBMISSION,
  createSalesCsvFile,
} from '@/tests/fixtures/sales-upload';

afterEach(() => {
  window.sessionStorage.clear();
});

function uploadResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        upload: {
          id: 'upload-1',
          original_filename: 'sales.csv',
          status: 'completed_with_errors',
          total_rows: 3,
          accepted_rows: 2,
          rejected_rows: 1,
          started_at: '2026-09-23T10:00:00Z',
          completed_at: '2026-09-23T10:00:01Z',
          failure_reason: null,
        },
      },
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('Sales Upload service adapters', () => {
  it('uses the authenticated multipart upload contract without manually setting Content-Type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(uploadResponse());
    const service = createHttpSalesUploadService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        getAccessToken: () => 'access-token',
        fetchImpl,
      }),
    );
    const file = createSalesCsvFile();
    const progress: Array<number | null> = [];

    await expect(
      service.uploadSalesCsv(file, (event) => progress.push(event.percent)),
    ).resolves.toEqual({
      result: {
        id: 'upload-1',
        originalFilename: 'sales.csv',
        status: 'completed_with_errors',
        totalRows: 3,
        acceptedRows: 2,
        rejectedRows: 1,
        startedAt: '2026-09-23T10:00:00Z',
        completedAt: '2026-09-23T10:00:01Z',
        failureReason: null,
      },
      rowErrors: [],
    });

    expect(progress).toEqual([null]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/sales/uploads',
    );
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe('POST');
    expect(request.headers).toBeInstanceOf(Headers);
    const headers = request.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.get('Content-Type')).toBeNull();
    expect(request.body).toBeInstanceOf(FormData);
    const body = request.body as FormData;
    const uploadedFile = body.get('file');
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe('sales.csv');
    expect((uploadedFile as File).size).toBe(file.size);
  });

  it('maps the backend duplicate-upload conflict to safe feature copy', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'duplicate_sales_upload',
            message: 'This sales file has already been uploaded.',
          },
        }),
        { status: 409 },
      ),
    );
    const service = createHttpSalesUploadService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(
      service.uploadSalesCsv(createSalesCsvFile(), () => undefined),
    ).rejects.toEqual(
      new SalesUploadServiceError(
        'duplicate_sales_upload',
        'This sales file has already been uploaded.',
      ),
    );
  });

  it('keeps the unavailable test seam isolated without performing a write', async () => {
    const service = createUnavailableSalesUploadService();

    await expect(
      service.uploadSalesCsv(createSalesCsvFile(), () => undefined),
    ).rejects.toMatchObject({
      code: 'sales_upload_unavailable',
    });
  });

  it('uses a session-scoped E2E fixture for success and backend-shaped row errors', async () => {
    const service = createE2ESalesUploadService();
    window.sessionStorage.setItem(
      SALES_UPLOAD_E2E_STORAGE_KEY,
      JSON.stringify({
        state: 'row_errors',
        submission: SALES_UPLOAD_ROW_ERROR_SUBMISSION,
      }),
    );
    const progress: number[] = [];

    await expect(
      service.uploadSalesCsv(createSalesCsvFile(), (event) => {
        if (event.percent !== null) {
          progress.push(event.percent);
        }
      }),
    ).resolves.toMatchObject({
      result: { status: 'completed_with_errors', acceptedRows: 1, rejectedRows: 2 },
      rowErrors: [
        { rowNumber: 3, errorCode: 'invalid_quantity' },
        { rowNumber: 4, errorCode: 'unknown_product_sku' },
      ],
    });
    expect(progress).toEqual([25, 75, 100]);
  });

  it('treats absent E2E fixture state as a safe upload failure', async () => {
    const service = createE2ESalesUploadService();

    await expect(
      service.uploadSalesCsv(createSalesCsvFile(), () => undefined),
    ).rejects.toMatchObject({
      message: 'Unable to upload the sales file.',
    });
  });
});
