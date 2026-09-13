import { afterEach, describe, expect, it } from 'vitest';

import {
  SALES_UPLOAD_E2E_STORAGE_KEY,
  createE2ESalesUploadService,
  createUnavailableSalesUploadService,
} from '@/features/sales/api';
import {
  SALES_UPLOAD_ROW_ERROR_SUBMISSION,
  createSalesCsvFile,
} from '@/tests/fixtures/sales-upload';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Sales Upload service adapters', () => {
  it('keeps the normal service unavailable without sending a file', async () => {
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
      service.uploadSalesCsv(createSalesCsvFile(), (event) =>
        progress.push(event.percent),
      ),
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
