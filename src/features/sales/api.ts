import type {
  SalesUploadProgress,
  SalesUploadSubmission,
} from '@/features/sales/types';

export type SalesUploadServiceErrorCode = 'sales_upload_unavailable';

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
 * Transport-independent future upload contract.
 *
 * A real adapter will post the file and, when rejected rows exist, retrieve the
 * backend's paginated rejected-row projection before resolving the submission.
 */
export interface SalesUploadService {
  uploadSalesCsv(
    file: File,
    onProgress: SalesUploadProgressListener,
  ): Promise<SalesUploadSubmission>;
}

/**
 * Honest normal-runtime placeholder. It sends no file and does not claim a
 * local upload succeeded before the backend integration phase.
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

const E2E_PROGRESS_DELAY_MS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

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
    window.setTimeout(resolve, E2E_PROGRESS_DELAY_MS);
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

const isE2ETestMode = process.env.NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE === 'true';

/** The sole Sales Upload service selected for the current build. */
export const salesUploadService: SalesUploadService = isE2ETestMode
  ? createE2ESalesUploadService()
  : createUnavailableSalesUploadService();
