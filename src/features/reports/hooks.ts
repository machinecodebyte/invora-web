'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  ReportsServiceError,
  reportsService,
  type ReportsService,
} from '@/features/reports/api';
import { reportFiltersSchema, toReportQuery } from '@/features/reports/schemas';
import type {
  ReportExportState,
  ReportFilters,
  ReportsViewState,
} from '@/features/reports/types';

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  reportType: 'sales_summary',
  dateFrom: '',
  dateTo: '',
  forecastRunId: '',
  productId: '',
  categoryId: '',
  channel: '',
  riskLevel: 'all',
  recommendationStatus: 'all',
  stockStatus: 'all',
};

const GENERIC_REPORT_ERROR = 'Unable to load report.';
const GENERIC_EXPORT_ERROR = 'Unable to export report.';

function toSafeMessage(error: unknown, fallback: string): string {
  return error instanceof ReportsServiceError ? error.message : fallback;
}

type ReportFilterField = keyof ReportFilters;

function validationDetails(filters: ReportFilters): {
  readonly field: ReportFilterField | null;
  readonly message: string | null;
} {
  const parsed = reportFiltersSchema.safeParse(filters);
  if (parsed.success) {
    return { field: null, message: null };
  }
  const issue = parsed.error.issues[0];
  const candidate = issue?.path[0];
  const field =
    typeof candidate === 'string' && candidate in DEFAULT_REPORT_FILTERS
      ? (candidate as ReportFilterField)
      : null;
  return {
    field,
    message: issue?.message ?? 'Check the report filters.',
  };
}

export interface UseReportsResult {
  readonly state: ReportsViewState;
  readonly filters: ReportFilters;
  readonly validationMessage: string | null;
  readonly validationField: ReportFilterField | null;
  readonly exportState: ReportExportState;
  readonly setFilters: (filters: ReportFilters) => void;
  readonly clearFilters: () => void;
  readonly reload: () => void;
  readonly exportCsv: () => Promise<void>;
}

/** Local report and export orchestration; server state stays behind ReportsService. */
export function useReports(
  service: ReportsService = reportsService,
): UseReportsResult {
  const [filters, setFiltersState] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<ReportsViewState>({ status: 'loading' });
  const [exportState, setExportState] = useState<ReportExportState>({ status: 'idle' });
  const validation = validationDetails(filters);

  useEffect(() => {
    if (!reportFiltersSchema.safeParse(filters).success) {
      return;
    }

    let active = true;
    void service
      .getReport(toReportQuery(filters))
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: toSafeMessage(error, GENERIC_REPORT_ERROR),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [filters, requestVersion, service]);

  const setFilters = useCallback((nextFilters: ReportFilters): void => {
    setExportState({ status: 'idle' });
    setFiltersState(nextFilters);
  }, []);

  const clearFilters = useCallback((): void => {
    setExportState({ status: 'idle' });
    setFiltersState(DEFAULT_REPORT_FILTERS);
  }, []);

  const reload = useCallback((): void => {
    const details = validationDetails(filters);
    if (details.message !== null) {
      return;
    }
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, [filters]);

  const exportCsv = useCallback(async (): Promise<void> => {
    if (exportState.status === 'preparing') {
      return;
    }
    const details = validationDetails(filters);
    if (details.message !== null) {
      return;
    }

    setExportState({ status: 'preparing' });
    try {
      const result = await service.exportReport({
        query: toReportQuery(filters),
        format: 'csv',
      });
      setExportState({ status: 'ready', filename: result.filename });
    } catch (error: unknown) {
      setExportState({
        status: 'error',
        message: toSafeMessage(error, GENERIC_EXPORT_ERROR),
      });
    }
  }, [exportState.status, filters, service]);

  return {
    state,
    filters,
    validationMessage: validation.message,
    validationField: validation.field,
    exportState,
    setFilters,
    clearFilters,
    reload,
    exportCsv,
  };
}
