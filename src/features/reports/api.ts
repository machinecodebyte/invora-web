import type {
  ReportData,
  ReportExportRequest,
  ReportExportResult,
  ReportQuery,
} from '@/features/reports/types';

export type ReportsServiceErrorCode =
  | 'reports_unavailable'
  | 'export_unavailable';

/** Safe error that can cross the Reports service and UI boundary. */
export class ReportsServiceError extends Error {
  constructor(
    public readonly code: ReportsServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReportsServiceError';
  }
}

/**
 * Read-only Reports and CSV-export contract for the later HTTP integration.
 * The actual backend returns a synchronous text/csv attachment for exports.
 */
export interface ReportsService {
  getReport(query: ReportQuery): Promise<ReportData>;
  exportReport(request: ReportExportRequest): Promise<ReportExportResult>;
}

/**
 * Deliberately honest runtime boundary: no report request or export is made
 * until the frontend-to-backend integration phase supplies an HTTP adapter.
 */
export function createUnavailableReportsService(): ReportsService {
  return {
    getReport: () =>
      Promise.reject(
        new ReportsServiceError('reports_unavailable', 'Unable to load report.'),
      ),
    exportReport: () =>
      Promise.reject(
        new ReportsServiceError('export_unavailable', 'Unable to export report.'),
      ),
  };
}

/** The Reports feature's sole normal-runtime service until API integration. */
export const reportsService: ReportsService = createUnavailableReportsService();
