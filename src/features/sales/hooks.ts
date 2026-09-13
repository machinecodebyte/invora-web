'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SalesHistoryServiceError,
  SalesUploadServiceError,
  salesHistoryService,
  salesUploadService,
  type SalesHistoryService,
  type SalesUploadService,
} from '@/features/sales/api';
import {
  getSalesUploadFileMetadata,
  validateSalesHistoryFilters,
  validateSalesUploadFile,
} from '@/features/sales/schemas';
import type {
  SalesHistoryChartState,
  SalesHistoryFilters,
  SalesHistoryListState,
  SalesHistoryQuery,
  SalesUploadProgress,
  SalesUploadViewState,
} from '@/features/sales/types';

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

const GENERIC_SALES_HISTORY_ERROR = 'Unable to load sales history.';
const GENERIC_SALES_CHART_ERROR = 'Unable to load sales chart.';

export const DEFAULT_SALES_HISTORY_FILTERS: SalesHistoryFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  source: 'all',
};

/** Matches the backend list endpoint's default limit and sort convention. */
export const SALES_HISTORY_DEFAULT_LIMIT = 50;

function toSafeSalesHistoryErrorMessage(error: unknown, fallback: string): string {
  return error instanceof SalesHistoryServiceError ? error.message : fallback;
}

function createSalesHistoryQuery(
  filters: SalesHistoryFilters,
  offset: number,
): SalesHistoryQuery {
  const search = filters.search.trim();
  return {
    search: search === '' ? null : search,
    dateFrom: filters.dateFrom === '' ? null : filters.dateFrom,
    dateTo: filters.dateTo === '' ? null : filters.dateTo,
    source: filters.source === 'all' ? null : filters.source,
    limit: SALES_HISTORY_DEFAULT_LIMIT,
    offset,
    sortBy: 'sale_date',
    sortOrder: 'desc',
  };
}

export function hasActiveSalesHistoryFilters(filters: SalesHistoryFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.source !== 'all'
  );
}

export interface UseSalesHistoryResult {
  readonly listState: SalesHistoryListState;
  readonly chartState: SalesHistoryChartState;
  readonly filters: SalesHistoryFilters;
  readonly filterError: string | null;
  readonly setFilters: (filters: SalesHistoryFilters) => void;
  readonly clearFilters: () => void;
  readonly setPageOffset: (offset: number) => void;
  readonly reload: () => void;
}

/**
 * Loads list and trend projections independently because the inspected backend
 * exposes distinct endpoints. This preserves a usable table when chart data is
 * temporarily unavailable, while keeping all requests behind a future adapter.
 */
export function useSalesHistory(
  service: SalesHistoryService = salesHistoryService,
): UseSalesHistoryResult {
  const [filters, setFiltersState] = useState<SalesHistoryFilters>(
    DEFAULT_SALES_HISTORY_FILTERS,
  );
  const [offset, setOffset] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [listState, setListState] = useState<SalesHistoryListState>({
    status: 'loading',
  });
  const [chartState, setChartState] = useState<SalesHistoryChartState>({
    status: 'loading',
  });
  const validation = validateSalesHistoryFilters(filters);
  const query = useMemo(
    () => createSalesHistoryQuery(filters, offset),
    [filters, offset],
  );

  useEffect(() => {
    if (!validation.valid) {
      return undefined;
    }

    let active = true;

    void service
      .listSalesHistory(query)
      .then((page) => {
        if (!active) {
          return;
        }
        setListState(
          page === null ? { status: 'empty' } : { status: 'ready', data: page },
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setListState({
            status: 'error',
            message: toSafeSalesHistoryErrorMessage(error, GENERIC_SALES_HISTORY_ERROR),
          });
        }
      });

    void service
      .getSalesTrend(query)
      .then((points) => {
        if (!active) {
          return;
        }
        setChartState(
          points === null || points.length === 0
            ? { status: 'empty' }
            : { status: 'ready', points },
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setChartState({
            status: 'error',
            message: toSafeSalesHistoryErrorMessage(error, GENERIC_SALES_CHART_ERROR),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [query, requestVersion, service, validation.valid]);

  const setFilters = useCallback((nextFilters: SalesHistoryFilters): void => {
    setFiltersState(nextFilters);
    setOffset(0);
    if (validateSalesHistoryFilters(nextFilters).valid) {
      setListState({ status: 'loading' });
      setChartState({ status: 'loading' });
    }
  }, []);

  const clearFilters = useCallback((): void => {
    setFiltersState(DEFAULT_SALES_HISTORY_FILTERS);
    setOffset(0);
    setListState({ status: 'loading' });
    setChartState({ status: 'loading' });
  }, []);

  const setPageOffset = useCallback((nextOffset: number): void => {
    setOffset(Math.max(nextOffset, 0));
    setListState({ status: 'loading' });
    setChartState({ status: 'loading' });
  }, []);

  const reload = useCallback((): void => {
    setListState({ status: 'loading' });
    setChartState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, []);

  return {
    listState,
    chartState,
    filters,
    filterError: validation.message,
    setFilters,
    clearFilters,
    setPageOffset,
    reload,
  };
}
