/**
 * Safe frontend projection of the Sales Upload contract.
 *
 * Upload batches are synchronous in the inspected backend. A future HTTP
 * adapter can retrieve the paginated rejected-row projection when needed;
 * raw CSV row data deliberately never enters this UI model.
 */

export const SALES_UPLOAD_REQUIRED_COLUMNS = [
  'sale_date',
  'product_sku',
  'quantity',
] as const;

export const SALES_UPLOAD_OPTIONAL_COLUMNS = [
  'unit_price',
  'total_amount',
  'customer_name',
  'channel',
  'notes',
] as const;

export const MAX_SALES_UPLOAD_BYTES = 5 * 1024 * 1024;

export type SalesUploadBatchStatus =
  'processing' | 'completed' | 'completed_with_errors' | 'failed';

export interface SalesUploadFileMetadata {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

/** Coarse transport progress, not a model of server-side processing. */
export interface SalesUploadProgress {
  readonly percent: number;
  readonly label: string;
}

/** Public upload-batch fields returned by the backend. */
export interface SalesUploadResult {
  readonly id: string;
  readonly originalFilename: string;
  readonly status: SalesUploadBatchStatus;
  readonly totalRows: number;
  readonly acceptedRows: number;
  readonly rejectedRows: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly failureReason: string | null;
}

/** Safe paginated rejected-row projection. `raw_data` is intentionally omitted. */
export interface SalesUploadRowError {
  readonly rowNumber: number;
  readonly errorCode: string;
  readonly errorMessage: string;
}

/** Result composed by a future service adapter after retrieving row errors. */
export interface SalesUploadSubmission {
  readonly result: SalesUploadResult;
  readonly rowErrors: readonly SalesUploadRowError[];
}

export type SalesUploadFileErrorCode =
  | 'invalid_sales_upload_file'
  | 'sales_upload_file_too_large'
  | 'invalid_sales_csv_format'
  | 'missing_sales_csv_columns';

export interface SalesUploadFileError {
  readonly code: SalesUploadFileErrorCode;
  readonly message: string;
  readonly missingColumns?: readonly string[];
}

export type SalesUploadPreflightResult =
  | {
      readonly valid: true;
      readonly metadata: SalesUploadFileMetadata;
    }
  | {
      readonly valid: false;
      readonly metadata: SalesUploadFileMetadata;
      readonly error: SalesUploadFileError;
    };

/** Explicit, mutually exclusive UI states for a single CSV upload attempt. */
export type SalesUploadViewState =
  | { readonly status: 'idle' }
  | { readonly status: 'validating'; readonly file: SalesUploadFileMetadata }
  | {
      readonly status: 'ready';
      readonly file: File;
      readonly metadata: SalesUploadFileMetadata;
    }
  | {
      readonly status: 'uploading';
      readonly file: File;
      readonly metadata: SalesUploadFileMetadata;
      readonly progress: SalesUploadProgress;
    }
  | {
      readonly status: 'success';
      readonly metadata: SalesUploadFileMetadata;
      readonly submission: SalesUploadSubmission;
    }
  | {
      readonly status: 'validation_error';
      readonly file: SalesUploadFileMetadata;
      readonly error: SalesUploadFileError;
    }
  | {
      readonly status: 'error';
      readonly file: File;
      readonly metadata: SalesUploadFileMetadata;
      readonly message: string;
    };

/**
 * Safe, Sales-facing product reference returned with a historical transaction.
 * It deliberately does not import the Product Catalog editing model.
 */
export interface SalesTransactionProductReference {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
}

/** Backend-defined source values for historical sales transactions. */
export type SalesTransactionSource = 'csv_upload' | 'manual' | 'api';

/**
 * Render-ready public transaction projection. Customer names, notes, deletion
 * metadata, and other detail-only fields intentionally stay outside this
 * read-only history table model.
 */
export interface SalesTransaction {
  readonly id: string;
  readonly productId: string;
  readonly product: SalesTransactionProductReference;
  readonly uploadBatchId: string | null;
  /** ISO-8601 calendar date; this is not a browser-local timestamp. */
  readonly saleDate: string;
  readonly quantity: number;
  readonly unitPrice: number | null;
  readonly totalAmount: number | null;
  readonly source: SalesTransactionSource;
  readonly createdAt: string;
}

/** Supported server-side sort fields kept ready for the future HTTP adapter. */
export type SalesTransactionSortField =
  | 'sale_date'
  | 'quantity'
  | 'unit_price'
  | 'total_amount'
  | 'source'
  | 'channel'
  | 'created_at'
  | 'updated_at'
  | 'product_name'
  | 'sku';

export type SalesSortOrder = 'asc' | 'desc';

/** UI-controlled filters supported by the future transaction list endpoint. */
export interface SalesHistoryFilters {
  readonly search: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly source: SalesTransactionSource | 'all';
}

/**
 * Future list request projection. Pagination follows the backend's offset /
 * limit model rather than inventing page-number semantics.
 */
export interface SalesHistoryQuery {
  readonly search: string | null;
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
  readonly source: SalesTransactionSource | null;
  readonly limit: number;
  readonly offset: number;
  readonly sortBy: SalesTransactionSortField;
  readonly sortOrder: SalesSortOrder;
}

/** Backend-aligned offset/limit list response projection. */
export interface SalesHistoryPage {
  readonly transactions: readonly SalesTransaction[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/** Public trend aggregate returned by the backend Sales Transaction trends API. */
export interface SalesTrendPoint {
  /** ISO-8601 calendar date representing the returned reporting period. */
  readonly periodStart: string;
  readonly totalQuantity: number;
  readonly totalAmount: number;
  readonly transactionCount: number;
}

export type SalesHistoryListState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: SalesHistoryPage }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string };

export type SalesHistoryChartState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly points: readonly SalesTrendPoint[] }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string };
