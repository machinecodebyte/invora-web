import type {
  SalesHistoryPage,
  SalesHistoryQuery,
  SalesTransaction,
  SalesTransactionSource,
  SalesTrendInterval,
  SalesTrendPoint,
  SalesUploadBatchStatus,
  SalesUploadProgress,
  SalesUploadSubmission,
} from '@/features/sales/types';
import { isApiError } from '@/lib/api-error';
import { apiClient, type ApiClient } from '@/lib/api-client';

export type SalesUploadServiceErrorCode =
  'sales_upload_unavailable' | 'duplicate_sales_upload';

/** Safe Sales Upload error exposed across the service and presentation boundary. */
export class SalesUploadServiceError extends Error {
  constructor(
    public readonly code: SalesUploadServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SalesUploadServiceError';
  }
}

export type SalesUploadProgressListener = (progress: SalesUploadProgress) => void;

/**
 * Transport-independent Sales Upload contract.
 *
 * The live endpoint returns the final synchronous upload batch. Rejected-row
 * exploration is intentionally outside the current Sales UI scope, so the
 * submission exposes backend counts without requesting raw rejected-row data.
 */
export interface SalesUploadService {
  uploadSalesCsv(
    file: File,
    onProgress: SalesUploadProgressListener,
  ): Promise<SalesUploadSubmission>;
}

type SalesUploadWire = {
  readonly id: string;
  readonly original_filename: string;
  readonly status: string;
  readonly total_rows: number;
  readonly accepted_rows: number;
  readonly rejected_rows: number;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly failure_reason: string | null;
};

type SalesTransactionProductWire = {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
};

type SalesTransactionWire = {
  readonly id: string;
  readonly product_id: string;
  readonly product: SalesTransactionProductWire;
  readonly upload_batch_id: string | null;
  readonly sale_date: string;
  readonly quantity: number | string;
  readonly unit_price: number | string | null;
  readonly total_amount: number | string | null;
  readonly source: string;
  readonly created_at: string;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const UPLOAD_BATCH_STATUSES = new Set<SalesUploadBatchStatus>([
  'processing',
  'completed',
  'completed_with_errors',
  'failed',
]);
const SALES_TRANSACTION_SOURCES = new Set<SalesTransactionSource>([
  'csv_upload',
  'manual',
  'api',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumericWireValue(value: unknown): value is number | string {
  return (
    (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'string'
  );
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value);
}

function isSalesUploadWire(value: unknown): value is SalesUploadWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.original_filename === 'string' &&
    typeof value.status === 'string' &&
    isFiniteNumber(value.total_rows) &&
    isFiniteNumber(value.accepted_rows) &&
    isFiniteNumber(value.rejected_rows) &&
    typeof value.started_at === 'string' &&
    (value.completed_at === null || typeof value.completed_at === 'string') &&
    (value.failure_reason === null || typeof value.failure_reason === 'string')
  );
}

function isSalesTransactionProductWire(
  value: unknown,
): value is SalesTransactionProductWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.sku === 'string'
  );
}

function isSalesTransactionWire(value: unknown): value is SalesTransactionWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.product_id === 'string' &&
    isSalesTransactionProductWire(value.product) &&
    (value.upload_batch_id === null || typeof value.upload_batch_id === 'string') &&
    isDateOnly(value.sale_date) &&
    isNumericWireValue(value.quantity) &&
    (value.unit_price === null || isNumericWireValue(value.unit_price)) &&
    (value.total_amount === null || isNumericWireValue(value.total_amount)) &&
    typeof value.source === 'string' &&
    typeof value.created_at === 'string'
  );
}

function invalidSalesResponse(): SalesUploadServiceError {
  return new SalesUploadServiceError(
    'sales_upload_unavailable',
    'The server returned an unexpected sales response.',
  );
}

/** Convert a Decimal-compatible backend scalar deliberately at the API boundary. */
function mapDecimal(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw invalidSalesResponse();
  }
  return parsed;
}

function mapNullableDecimal(value: number | string | null): number | null {
  return value === null ? null : mapDecimal(value);
}

/** Maps the unwrapped `{ upload }` Sales Upload response. */
export function mapSalesUploadResponse(value: unknown): SalesUploadSubmission {
  if (!isRecord(value) || !isSalesUploadWire(value.upload)) {
    throw invalidSalesResponse();
  }

  const upload = value.upload;
  if (!UPLOAD_BATCH_STATUSES.has(upload.status as SalesUploadBatchStatus)) {
    throw invalidSalesResponse();
  }

  return {
    result: {
      id: upload.id,
      originalFilename: upload.original_filename,
      status: upload.status as SalesUploadBatchStatus,
      totalRows: upload.total_rows,
      acceptedRows: upload.accepted_rows,
      rejectedRows: upload.rejected_rows,
      startedAt: upload.started_at,
      completedAt: upload.completed_at,
      failureReason: upload.failure_reason,
    },
    // The existing UI can show backend counts. Fetching rejected rows would
    // introduce a separate feature that the current UI does not request.
    rowErrors: [],
  };
}

/** Maps a safe backend transaction projection while preserving calendar dates. */
export function mapSalesTransactionResponse(value: unknown): SalesTransaction {
  if (!isSalesTransactionWire(value)) {
    throw invalidSalesResponse();
  }
  if (!SALES_TRANSACTION_SOURCES.has(value.source as SalesTransactionSource)) {
    throw invalidSalesResponse();
  }

  return {
    id: value.id,
    productId: value.product_id,
    product: {
      id: value.product.id,
      name: value.product.name,
      sku: value.product.sku,
    },
    uploadBatchId: value.upload_batch_id,
    saleDate: value.sale_date,
    quantity: mapDecimal(value.quantity),
    unitPrice: mapNullableDecimal(value.unit_price),
    totalAmount: mapNullableDecimal(value.total_amount),
    source: value.source as SalesTransactionSource,
    createdAt: value.created_at,
  };
}

/** Maps the unwrapped offset/limit Sales Transaction list response. */
export function mapSalesHistoryPageResponse(value: unknown): SalesHistoryPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.transactions) ||
    !isFiniteNumber(value.total) ||
    !isFiniteNumber(value.limit) ||
    !isFiniteNumber(value.offset)
  ) {
    throw invalidSalesResponse();
  }

  return {
    transactions: value.transactions.map(mapSalesTransactionResponse),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

/** Maps one backend-owned trend aggregate without timezone conversion. */
export function mapSalesTrendPointResponse(value: unknown): SalesTrendPoint {
  if (
    !isRecord(value) ||
    !isDateOnly(value.period_start) ||
    !isNumericWireValue(value.total_quantity) ||
    !isNumericWireValue(value.total_amount) ||
    !isFiniteNumber(value.transaction_count)
  ) {
    throw invalidSalesResponse();
  }

  return {
    periodStart: value.period_start,
    totalQuantity: mapDecimal(value.total_quantity),
    totalAmount: mapDecimal(value.total_amount),
    transactionCount: value.transaction_count,
  };
}

/** Maps the unwrapped `{ trends }` Sales Trends response. */
export function mapSalesTrendResponse(value: unknown): readonly SalesTrendPoint[] {
  if (!isRecord(value) || !Array.isArray(value.trends)) {
    throw invalidSalesResponse();
  }
  return value.trends.map(mapSalesTrendPointResponse);
}

function normalizeUploadError(error: unknown): never {
  if (isApiError(error) && error.code === 'duplicate_sales_upload') {
    throw new SalesUploadServiceError(
      'duplicate_sales_upload',
      'This sales file has already been uploaded.',
    );
  }
  throw error;
}

/**
 * Real FastAPI Sales Upload adapter for normal application builds.
 *
 * `FormData` is intentionally passed straight to the shared client. It must
 * remain responsible for not declaring `Content-Type`, allowing the browser to
 * attach the multipart boundary.
 */
export function createHttpSalesUploadService(
  client: ApiClient = apiClient,
): SalesUploadService {
  return {
    async uploadSalesCsv(file, onProgress) {
      // Fetch does not expose portable upload-byte progress. This describes an
      // indeterminate request state rather than pretending to know server CSV
      // processing progress.
      onProgress({ percent: null, label: 'Submitting sales CSV' });
      const formData = new FormData();
      formData.append('file', file, file.name);

      try {
        return mapSalesUploadResponse(
          await client.post<unknown>('/api/v1/sales/uploads', formData),
        );
      } catch (error) {
        return normalizeUploadError(error);
      }
    },
  };
}

/**
 * Deliberately unavailable seam retained for isolated tests. It makes no
 * network request and is never selected by a normal application build.
 */
export function createUnavailableSalesUploadService(): SalesUploadService {
  return {
    uploadSalesCsv: () =>
      Promise.reject(
        new SalesUploadServiceError(
          'sales_upload_unavailable',
          'Sales uploads are not available yet.',
        ),
      ),
  };
}

/** Storage key read only by the Playwright-managed Sales Upload adapter. */
export const SALES_UPLOAD_E2E_STORAGE_KEY = 'invora-e2e-sales-upload-fixture';

export type SalesUploadE2EFixture =
  | { readonly state: 'success'; readonly submission: SalesUploadSubmission }
  | { readonly state: 'row_errors'; readonly submission: SalesUploadSubmission }
  | { readonly state: 'error' };

/**
 * Each Playwright-only progress stage must remain visible long enough for a
 * browser assertion to observe the rendered state. This is test-adapter UI
 * pacing, not production transport latency.
 */
const E2E_PROGRESS_STAGE_MS = 300;

function isSalesUploadSubmission(value: unknown): value is SalesUploadSubmission {
  if (!isRecord(value) || !isRecord(value.result) || !Array.isArray(value.rowErrors)) {
    return false;
  }

  const { result } = value;
  const hasValidStatus =
    result.status === 'processing' ||
    result.status === 'completed' ||
    result.status === 'completed_with_errors' ||
    result.status === 'failed';
  return (
    typeof result.id === 'string' &&
    typeof result.originalFilename === 'string' &&
    hasValidStatus &&
    isFiniteNumber(result.totalRows) &&
    isFiniteNumber(result.acceptedRows) &&
    isFiniteNumber(result.rejectedRows) &&
    typeof result.startedAt === 'string' &&
    (result.completedAt === null || typeof result.completedAt === 'string') &&
    (result.failureReason === null || typeof result.failureReason === 'string') &&
    value.rowErrors.every(
      (error) =>
        isRecord(error) &&
        isFiniteNumber(error.rowNumber) &&
        typeof error.errorCode === 'string' &&
        typeof error.errorMessage === 'string',
    )
  );
}

function readE2EFixture(): SalesUploadE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'error' };
  }

  const encodedFixture = window.sessionStorage.getItem(SALES_UPLOAD_E2E_STORAGE_KEY);
  if (encodedFixture === null) {
    return { state: 'error' };
  }

  try {
    const value: unknown = JSON.parse(encodedFixture);
    if (
      isRecord(value) &&
      (value.state === 'success' || value.state === 'row_errors') &&
      isSalesUploadSubmission(value.submission)
    ) {
      return { state: value.state, submission: value.submission };
    }
    if (isRecord(value) && value.state === 'error') {
      return { state: 'error' };
    }
  } catch {
    // A malformed test fixture must never crash the application.
  }

  return { state: 'error' };
}

function waitForE2EProgress(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, E2E_PROGRESS_STAGE_MS);
  });
}

/**
 * Deterministic adapter selected only for Playwright's managed test build.
 * Its outcome is isolated in browser session storage and is not a mock backend.
 */
export function createE2ESalesUploadService(): SalesUploadService {
  return {
    async uploadSalesCsv(_file, onProgress) {
      onProgress({ percent: 25, label: 'Uploading sales CSV' });
      await waitForE2EProgress();
      onProgress({ percent: 75, label: 'Uploading sales CSV' });
      await waitForE2EProgress();

      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        throw new SalesUploadServiceError(
          'sales_upload_unavailable',
          'Unable to upload the sales file.',
        );
      }

      onProgress({ percent: 100, label: 'Upload complete' });
      return fixture.submission;
    },
  };
}

const isSalesUploadE2ETestMode =
  process.env.NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE === 'true';

/** The sole Sales Upload service selected for the current build. */
export const salesUploadService: SalesUploadService = isSalesUploadE2ETestMode
  ? createE2ESalesUploadService()
  : createHttpSalesUploadService();

export type SalesHistoryServiceErrorCode = 'sales_history_unavailable';

/** Safe Sales History error exposed across the service and presentation boundary. */
export class SalesHistoryServiceError extends Error {
  constructor(
    public readonly code: SalesHistoryServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SalesHistoryServiceError';
  }
}

export interface SalesHistoryRequestOptions {
  readonly signal?: AbortSignal | undefined;
}

/** Transport-independent Sales Transaction list and trends contract. */
export interface SalesHistoryService {
  listSalesHistory(
    query: SalesHistoryQuery,
    options?: SalesHistoryRequestOptions,
  ): Promise<SalesHistoryPage | null>;
  getSalesTrend(
    query: SalesHistoryQuery,
    interval: SalesTrendInterval,
    options?: SalesHistoryRequestOptions,
  ): Promise<readonly SalesTrendPoint[] | null>;
}

function trimOrNull(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Maps the existing camelCase/Sales UI query to FastAPI list query names. */
export function toSalesHistoryListQuery(
  query: SalesHistoryQuery,
): Record<string, string | number | null> {
  return {
    search: trimOrNull(query.search),
    date_from: trimOrNull(query.dateFrom),
    date_to: trimOrNull(query.dateTo),
    source: query.source,
    limit: query.limit,
    offset: query.offset,
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  };
}

/** Maps only backend-supported trend filters; list-only filters are omitted. */
export function toSalesTrendQuery(
  query: SalesHistoryQuery,
  interval: SalesTrendInterval,
): Record<string, string | null> {
  return {
    date_from: trimOrNull(query.dateFrom),
    date_to: trimOrNull(query.dateTo),
    interval,
  };
}

/** Real FastAPI Sales History and Trends adapter for normal application builds. */
export function createHttpSalesHistoryService(
  client: ApiClient = apiClient,
): SalesHistoryService {
  return {
    async listSalesHistory(query, options) {
      return mapSalesHistoryPageResponse(
        await client.get<unknown>('/api/v1/sales/transactions', {
          query: toSalesHistoryListQuery(query),
          ...(options?.signal === undefined ? {} : { signal: options.signal }),
        }),
      );
    },
    async getSalesTrend(query, interval, options) {
      return mapSalesTrendResponse(
        await client.get<unknown>('/api/v1/sales/transactions/trends', {
          query: toSalesTrendQuery(query, interval),
          ...(options?.signal === undefined ? {} : { signal: options.signal }),
        }),
      );
    },
  };
}

/** Test-only unavailable seam; never selected by a normal application build. */
export function createUnavailableSalesHistoryService(): SalesHistoryService {
  return {
    listSalesHistory: () => Promise.resolve(null),
    getSalesTrend: () => Promise.resolve(null),
  };
}

/** The sole Sales History service selected for normal frontend builds. */
export const salesHistoryService: SalesHistoryService = createHttpSalesHistoryService();
