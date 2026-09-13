'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SalesUploadService } from '@/features/sales/api';
import { SalesUploadProgress } from '@/features/sales/components/sales-upload-progress';
import { SalesUploadResult } from '@/features/sales/components/sales-upload-result';
import { useSalesUpload } from '@/features/sales/hooks';
import {
  MAX_SALES_UPLOAD_BYTES,
  SALES_UPLOAD_OPTIONAL_COLUMNS,
  SALES_UPLOAD_REQUIRED_COLUMNS,
  type SalesUploadFileMetadata,
  type SalesUploadViewState,
} from '@/features/sales/types';

const FILE_INPUT_ID = 'sales-upload-file';
const REQUIREMENTS_ID = 'sales-upload-requirements';
const FILE_ERROR_ID = 'sales-upload-file-error';

export interface SalesUploadViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  service?: SalesUploadService;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function metadataFromState(
  state: SalesUploadViewState,
): SalesUploadFileMetadata | null {
  switch (state.status) {
    case 'idle':
      return null;
    case 'validating':
    case 'validation_error':
    case 'ready':
    case 'uploading':
    case 'success':
    case 'error':
      return state.status === 'success' ? state.metadata : state.file;
  }
}

function selectedFileStatus(state: SalesUploadViewState): string {
  switch (state.status) {
    case 'validating':
      return 'Checking file requirements';
    case 'ready':
      return 'Ready to upload';
    case 'uploading':
      return 'Uploading';
    case 'success':
      return 'Upload complete';
    case 'validation_error':
      return 'Needs attention';
    case 'error':
      return 'Upload failed';
    case 'idle':
      return '';
  }
}

/**
 * Protected Sales Upload screen content. It remains truthful in normal builds:
 * valid files can be selected, but no upload is persisted until API integration.
 */
export function SalesUploadView({ service }: SalesUploadViewProps) {
  const { state, selectFile, upload, retry, reset } = useSalesUpload(service);
  const [inputKey, setInputKey] = useState(0);
  const metadata = metadataFromState(state);
  const isBusy = state.status === 'validating' || state.status === 'uploading';
  const isInvalid = state.status === 'validation_error';

  const resetUpload = (): void => {
    reset();
    setInputKey((key) => key + 1);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.item(0);
    if (file !== null && file !== undefined) {
      void selectFile(file);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <Card aria-labelledby="sales-upload-title">
        <CardHeader>
          <CardTitle id="sales-upload-title" as="h2">
            Upload sales CSV
          </CardTitle>
          <CardDescription>
            Add historical sales demand from a single CSV file. Uploads do not update
            inventory stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={FILE_INPUT_ID}>Sales CSV file</Label>
            <Input
              key={inputKey}
              id={FILE_INPUT_ID}
              type="file"
              accept=".csv,text/csv,application/csv,application/vnd.ms-excel,application/octet-stream,text/plain"
              disabled={isBusy}
              invalid={isInvalid}
              aria-describedby={
                isInvalid ? `${REQUIREMENTS_ID} ${FILE_ERROR_ID}` : REQUIREMENTS_ID
              }
              onChange={onFileChange}
            />
            <p id={REQUIREMENTS_ID} className="text-sm text-foreground-muted">
              CSV only, maximum {formatFileSize(MAX_SALES_UPLOAD_BYTES)}. Required
              headers: {SALES_UPLOAD_REQUIRED_COLUMNS.join(', ')}. Optional headers:{' '}
              {SALES_UPLOAD_OPTIONAL_COLUMNS.join(', ')}.
            </p>
          </div>

          {metadata === null ? (
            <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm text-foreground-muted">
              Choose one UTF-8 CSV file to validate its format before uploading.
            </p>
          ) : (
            <section
              aria-label="Selected sales file"
              className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-all text-sm font-medium text-foreground">
                  {metadata.name}
                </p>
                <p className="mt-1 text-sm text-foreground-muted">
                  {formatFileSize(metadata.size)} · {selectedFileStatus(state)}
                </p>
              </div>
              {isBusy ? null : (
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  Remove file
                </Button>
              )}
            </section>
          )}

          {state.status === 'validating' ? (
            <p role="status" className="text-sm text-foreground-muted">
              Checking CSV requirements…
            </p>
          ) : null}

          {state.status === 'validation_error' ? (
            <div
              id={FILE_ERROR_ID}
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/5 p-4"
            >
              <p className="text-sm font-semibold text-danger">File needs attention</p>
              <p className="mt-1 text-sm text-foreground">{state.error.message}</p>
            </div>
          ) : null}

          {state.status === 'uploading' ? (
            <SalesUploadProgress progress={state.progress} />
          ) : null}

          {state.status === 'error' ? (
            <div
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/5 p-4"
            >
              <p className="text-sm font-semibold text-danger">{state.message}</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Your file remains selected. Retry only when you are ready to make a new
                upload attempt.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={state.status !== 'ready'}
              isLoading={state.status === 'uploading'}
              loadingLabel="Uploading sales CSV"
              onClick={() => void upload()}
            >
              Upload sales CSV
            </Button>
            {state.status === 'error' ? (
              <Button onClick={() => void retry()}>Retry upload</Button>
            ) : null}
            {state.status === 'success' ? (
              <Button variant="secondary" onClick={resetUpload}>
                Upload another file
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {state.status === 'success' ? (
        <SalesUploadResult submission={state.submission} />
      ) : null}
    </div>
  );
}
