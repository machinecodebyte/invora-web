import { z } from 'zod';

import {
  MAX_SALES_UPLOAD_BYTES,
  SALES_UPLOAD_REQUIRED_COLUMNS,
  type SalesUploadFileError,
  type SalesUploadFileMetadata,
  type SalesUploadPreflightResult,
} from '@/features/sales/types';

const MAX_HEADER_INSPECTION_BYTES = 64 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
  'text/plain',
  '',
]);

/** A small Zod boundary for browser-provided file metadata. */
export const salesUploadFileMetadataSchema = z.object({
  name: z.string().min(1),
  size: z.number().finite().nonnegative(),
  type: z.string(),
});

function fileError(
  code: SalesUploadFileError['code'],
  message: string,
  missingColumns?: readonly string[],
): SalesUploadFileError {
  return missingColumns === undefined
    ? { code, message }
    : { code, message, missingColumns };
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * Reads only the first CSV record. This intentionally does not parse data rows
 * or duplicate backend business validation; it handles quoted header cells so
 * frontend header checks match the backend's CSV reader closely enough for UX.
 */
function parseCsvHeaderRecord(value: string): readonly string[] | null {
  const headers: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === undefined) {
      break;
    }

    if (character === '"') {
      const nextCharacter = value[index + 1];
      if (quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === ',') {
      headers.push(cell);
      cell = '';
      continue;
    }

    if (!quoted && (character === '\n' || character === '\r')) {
      headers.push(cell);
      return headers;
    }

    cell += character;
  }

  return null;
}

function readHeaderPrefix(file: File): Promise<string> {
  const prefix = file.slice(0, Math.min(file.size, MAX_HEADER_INSPECTION_BYTES));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read CSV.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(prefix, 'UTF-8');
  });
}

export function getSalesUploadFileMetadata(file: File): SalesUploadFileMetadata {
  return salesUploadFileMetadataSchema.parse({
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

/**
 * Lightweight file preflight aligned with the inspected backend upload rules.
 * Product ownership, duplicate content, and row validation remain server-side.
 */
export async function validateSalesUploadFile(
  file: File,
): Promise<SalesUploadPreflightResult> {
  const metadata = getSalesUploadFileMetadata(file);
  if (!metadata.name.toLocaleLowerCase().endsWith('.csv')) {
    return {
      valid: false,
      metadata,
      error: fileError(
        'invalid_sales_upload_file',
        'Only .csv sales uploads are supported.',
      ),
    };
  }
  if (metadata.size > MAX_SALES_UPLOAD_BYTES) {
    return {
      valid: false,
      metadata,
      error: fileError(
        'sales_upload_file_too_large',
        'Sales upload file is too large. The maximum size is 5 MiB.',
      ),
    };
  }
  if (metadata.size === 0) {
    return {
      valid: false,
      metadata,
      error: fileError('invalid_sales_upload_file', 'Sales upload file is empty.'),
    };
  }

  const normalizedType = metadata.type.split(';')[0]?.trim().toLocaleLowerCase() ?? '';
  if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    return {
      valid: false,
      metadata,
      error: fileError(
        'invalid_sales_upload_file',
        'Sales upload content type is unsupported.',
      ),
    };
  }

  let headers: readonly string[] | null;
  try {
    headers = parseCsvHeaderRecord(
      (await readHeaderPrefix(file)).replace(/^\uFEFF/u, ''),
    );
  } catch {
    return {
      valid: false,
      metadata,
      error: fileError(
        'invalid_sales_csv_format',
        'Sales CSV could not be read. Use a UTF-8 encoded CSV file.',
      ),
    };
  }

  if (headers === null) {
    return {
      valid: false,
      metadata,
      error: fileError(
        'invalid_sales_csv_format',
        'Sales CSV must include a header row and at least one data row.',
      ),
    };
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    return {
      valid: false,
      metadata,
      error: fileError(
        'invalid_sales_csv_format',
        'Sales CSV contains duplicate columns.',
      ),
    };
  }

  const missingColumns = SALES_UPLOAD_REQUIRED_COLUMNS.filter(
    (column) => !normalizedHeaders.includes(column),
  ).sort();
  if (missingColumns.length > 0) {
    return {
      valid: false,
      metadata,
      error: fileError(
        'missing_sales_csv_columns',
        `Sales CSV is missing required columns: ${missingColumns.join(', ')}.`,
        missingColumns,
      ),
    };
  }

  return { valid: true, metadata };
}
