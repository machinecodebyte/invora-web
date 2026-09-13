import { describe, expect, it } from 'vitest';

import { validateSalesUploadFile } from '@/features/sales/schemas';
import { MAX_SALES_UPLOAD_BYTES } from '@/features/sales/types';
import {
  MISSING_HEADER_SALES_CSV,
  VALID_SALES_CSV,
  createSalesCsvFile,
} from '@/tests/fixtures/sales-upload';

describe('Sales Upload file preflight', () => {
  it('accepts backend-aligned UTF-8 CSV headers with case, whitespace, and optional columns', async () => {
    const file = createSalesCsvFile(
      ' SALE_DATE , Product_SKU , QUANTITY , notes \n2026-09-01,TEST-SKU-1,2.000,Test\n',
      'SALES.CSV',
      'application/vnd.ms-excel',
    );

    await expect(validateSalesUploadFile(file)).resolves.toMatchObject({
      valid: true,
      metadata: { name: 'SALES.CSV' },
    });
  });

  it('rejects unsupported extensions, empty files, oversized files, and unsupported types', async () => {
    await expect(
      validateSalesUploadFile(createSalesCsvFile(VALID_SALES_CSV, 'sales.xlsx')),
    ).resolves.toMatchObject({
      valid: false,
      error: { message: 'Only .csv sales uploads are supported.' },
    });
    await expect(
      validateSalesUploadFile(createSalesCsvFile('')),
    ).resolves.toMatchObject({
      valid: false,
      error: { message: 'Sales upload file is empty.' },
    });
    await expect(
      validateSalesUploadFile(
        new File([new Uint8Array(MAX_SALES_UPLOAD_BYTES + 1)], 'sales.csv', {
          type: 'text/csv',
        }),
      ),
    ).resolves.toMatchObject({
      valid: false,
      error: { code: 'sales_upload_file_too_large' },
    });
    await expect(
      validateSalesUploadFile(
        createSalesCsvFile(VALID_SALES_CSV, 'sales.csv', 'application/json'),
      ),
    ).resolves.toMatchObject({
      valid: false,
      error: { message: 'Sales upload content type is unsupported.' },
    });
  });

  it('rejects a missing required header and duplicate headers without parsing sales rows', async () => {
    await expect(
      validateSalesUploadFile(createSalesCsvFile(MISSING_HEADER_SALES_CSV)),
    ).resolves.toMatchObject({
      valid: false,
      error: {
        code: 'missing_sales_csv_columns',
        missingColumns: ['quantity'],
      },
    });
    await expect(
      validateSalesUploadFile(
        createSalesCsvFile(
          'sale_date,product_sku,quantity,quantity\n2026-09-01,TEST-SKU-1,2.000,2.000\n',
        ),
      ),
    ).resolves.toMatchObject({
      valid: false,
      error: { message: 'Sales CSV contains duplicate columns.' },
    });
  });
});
