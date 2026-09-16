/** Backend report identifiers exposed by the Reports module. */
export const REPORT_TYPES = [
  'model_performance',
  'inventory_risk',
  'reorder_summary',
  'demand_forecast',
  'sales_summary',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

/** The Reports backend currently exposes CSV as its only export format. */
export const REPORT_EXPORT_FORMATS = ['csv'] as const;

export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];

export const REPORT_RISK_LEVELS = [
  'low',
  'medium',
  'high',
  'critical',
  'overstocked',
] as const;

export const REPORT_RECOMMENDATION_STATUSES = [
  'open',
  'acknowledged',
  'dismissed',
] as const;

export const REPORT_STOCK_STATUSES = [
  'low_stock',
  'out_of_stock',
  'healthy',
  'inactive',
] as const;

export type ReportRiskLevel = (typeof REPORT_RISK_LEVELS)[number];
export type ReportRecommendationStatus =
  (typeof REPORT_RECOMMENDATION_STATUSES)[number];
export type ReportStockStatus = (typeof REPORT_STOCK_STATUSES)[number];
export type ReportRiskFilter = 'all' | ReportRiskLevel;
export type ReportRecommendationStatusFilter = 'all' | ReportRecommendationStatus;
export type ReportStockStatusFilter = 'all' | ReportStockStatus;

/** Filter state mirrors only query parameters supported by the Reports backend. */
export interface ReportFilters {
  readonly reportType: ReportType;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly forecastRunId: string;
  readonly productId: string;
  readonly categoryId: string;
  readonly channel: string;
  readonly riskLevel: ReportRiskFilter;
  readonly recommendationStatus: ReportRecommendationStatusFilter;
  readonly stockStatus: ReportStockStatusFilter;
}

/** Transport-neutral future request for a JSON report representation. */
export interface ReportQuery {
  readonly reportType: ReportType;
  readonly dateFrom: string | null;
  readonly dateTo: string | null;
  readonly forecastRunId: string | null;
  readonly productId: string | null;
  readonly categoryId: string | null;
  readonly channel: string | null;
  readonly riskLevel: ReportRiskLevel | null;
  readonly recommendationStatus: ReportRecommendationStatus | null;
  readonly stockStatus: ReportStockStatus | null;
}

export type ReportValue = string | number | null;
export type ReportValueFormat = 'text' | 'number' | 'currency' | 'date' | 'percentage';

/** A field selected from the active backend report's own response contract. */
export interface ReportColumn {
  readonly key: string;
  readonly label: string;
  readonly format: ReportValueFormat;
}

/**
 * Display projection of a backend report row. The future HTTP adapter maps the
 * individual report schemas to this shape; it never merges unrelated reports.
 */
export interface ReportRow {
  readonly id: string;
  readonly cells: Readonly<Record<string, ReportValue>>;
}

/** Backend-provided report summary value after safe adapter normalization. */
export interface ReportSummaryMetric {
  readonly label: string;
  readonly value: ReportValue;
  readonly format: ReportValueFormat;
}

/** Read-only presentation contract for exactly one selected report type. */
export interface ReportData {
  readonly reportType: ReportType;
  readonly title: string;
  readonly description: string;
  readonly generatedAt: string | null;
  readonly summary: readonly ReportSummaryMetric[];
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly ReportRow[];
}

export interface ReportExportRequest {
  readonly query: ReportQuery;
  readonly format: ReportExportFormat;
}

/** Metadata from the backend's synchronous CSV attachment response. */
export interface ReportExportResult {
  readonly filename: string;
  readonly contentType: 'text/csv';
}

export type ReportsViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: ReportData }
  | { readonly status: 'error'; readonly message: string };

export type ReportExportState =
  | { readonly status: 'idle' }
  | { readonly status: 'preparing' }
  | { readonly status: 'ready'; readonly filename: string }
  | { readonly status: 'error'; readonly message: string };

export interface ReportDefinition {
  readonly type: ReportType;
  readonly label: string;
  readonly description: string;
}

/** Read-only UI metadata for the five backend report endpoints. */
export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  {
    type: 'sales_summary',
    label: 'Sales summary',
    description: 'Summarized sales activity by product.',
  },
  {
    type: 'inventory_risk',
    label: 'Inventory risk',
    description: 'Current stock coverage and inventory health.',
  },
  {
    type: 'reorder_summary',
    label: 'Reorder summary',
    description: 'Backend-generated reorder decisions and risk.',
  },
  {
    type: 'demand_forecast',
    label: 'Demand forecast',
    description: 'Forecast output for one completed forecast run.',
  },
  {
    type: 'model_performance',
    label: 'Model performance',
    description: 'Forecast run quality and model performance metrics.',
  },
];
