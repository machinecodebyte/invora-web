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
