'use client';

import { useCallback, useRef, useState } from 'react';

import {
  SalesUploadServiceError,
  salesUploadService,
  type SalesUploadService,
} from '@/features/sales/api';
import {
  getSalesUploadFileMetadata,
  validateSalesUploadFile,
} from '@/features/sales/schemas';
import type { SalesUploadProgress, SalesUploadViewState } from '@/features/sales/types';

const GENERIC_UPLOAD_ERROR = 'Unable to upload the sales file.';

function toSafeErrorMessage(error: unknown): string {
  return error instanceof SalesUploadServiceError
    ? error.message
    : GENERIC_UPLOAD_ERROR;
}

export interface UseSalesUploadResult {
  readonly state: SalesUploadViewState;
  selectFile: (file: File) => Promise<void>;
  upload: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

/**
 * Single-file Sales Upload orchestration. File state is transient browser state
 * only; it is not persisted, logged, or placed in the URL.
 */
export function useSalesUpload(
  service: SalesUploadService = salesUploadService,
): UseSalesUploadResult {
  const [state, setState] = useState<SalesUploadViewState>({ status: 'idle' });
  const selectionVersion = useRef(0);
  const uploadInFlight = useRef(false);

  const reset = useCallback(() => {
    selectionVersion.current += 1;
    setState({ status: 'idle' });
  }, []);

  const selectFile = useCallback(async (file: File): Promise<void> => {
    const requestVersion = selectionVersion.current + 1;
    selectionVersion.current = requestVersion;
    const metadata = getSalesUploadFileMetadata(file);
    setState({ status: 'validating', file: metadata });

    const result = await validateSalesUploadFile(file);
    if (selectionVersion.current !== requestVersion) {
      return;
    }

    setState(
      result.valid
        ? { status: 'ready', file, metadata: result.metadata }
        : {
            status: 'validation_error',
            file: result.metadata,
            error: result.error,
          },
    );
  }, []);

  const uploadFile = useCallback(
    async (file: File): Promise<void> => {
      if (uploadInFlight.current) {
        return;
      }

      uploadInFlight.current = true;
      const metadata = getSalesUploadFileMetadata(file);
      const onProgress = (progress: SalesUploadProgress): void => {
        setState((current) =>
          current.status === 'uploading' && current.file === file
            ? { ...current, progress }
            : current,
        );
      };

      setState({
        status: 'uploading',
        file,
        metadata,
        progress: { percent: 0, label: 'Uploading sales CSV' },
      });

      try {
        const submission = await service.uploadSalesCsv(file, onProgress);
        setState({ status: 'success', metadata, submission });
      } catch (error: unknown) {
        setState({
          status: 'error',
          file,
          metadata,
          message: toSafeErrorMessage(error),
        });
      } finally {
        uploadInFlight.current = false;
      }
    },
    [service],
  );

  const upload = useCallback(async (): Promise<void> => {
    if (state.status === 'ready') {
      await uploadFile(state.file);
    }
  }, [state, uploadFile]);

  const retry = useCallback(async (): Promise<void> => {
    if (state.status === 'error') {
      await uploadFile(state.file);
    }
  }, [state, uploadFile]);

  return { state, selectFile, upload, retry, reset };
}
