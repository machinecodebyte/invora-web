import type { SalesUploadSubmission } from '@/features/sales/types';

/** Artificial CSV content used only by tests; it is not bundled as product data. */
export const VALID_SALES_CSV =
  'sale_date,product_sku,quantity\n2026-09-01,TEST-SKU-1,2.000\n';

export const MISSING_HEADER_SALES_CSV =
  'sale_date,product_sku\n2026-09-01,TEST-SKU-1\n';

export const SALES_UPLOAD_SUCCESS_SUBMISSION: SalesUploadSubmission = {
  result: {
    id: 'test-sales-upload-success',
    originalFilename: 'sales.csv',
    status: 'completed',
    totalRows: 2,
    acceptedRows: 2,
    rejectedRows: 0,
    startedAt: '2026-09-12T00:00:00.000Z',
    completedAt: '2026-09-12T00:00:01.000Z',
    failureReason: null,
  },
  rowErrors: [],
};

export const SALES_UPLOAD_ROW_ERROR_SUBMISSION: SalesUploadSubmission = {
  result: {
    id: 'test-sales-upload-row-errors',
    originalFilename: 'sales.csv',
    status: 'completed_with_errors',
    totalRows: 3,
    acceptedRows: 1,
    rejectedRows: 2,
    startedAt: '2026-09-12T00:00:00.000Z',
    completedAt: '2026-09-12T00:00:01.000Z',
    failureReason: null,
  },
  rowErrors: [
    {
      rowNumber: 3,
      errorCode: 'invalid_quantity',
      errorMessage: 'quantity must be positive.',
    },
    {
      rowNumber: 4,
      errorCode: 'unknown_product_sku',
      errorMessage: 'Product SKU was not found for this user.',
    },
  ],
};

export function createSalesCsvFile(
  content = VALID_SALES_CSV,
  name = 'sales.csv',
  type = 'text/csv',
): File {
  return new File([content], name, { type });
}
