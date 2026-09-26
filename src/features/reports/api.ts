import { apiClient, type ApiResponse, type RequestConfig } from '@/lib/api-client';
import {
  REPORT_DEFINITIONS,
  type ReportData,
  type ReportExportRequest,
  type ReportExportResult,
  type ReportQuery,
  type ReportRow,
  type ReportType,
} from '@/features/reports/types';
import type { QueryParams } from '@/types/api';

export type ReportsServiceErrorCode = 'reports_unavailable' | 'export_unavailable';

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

/** Read-only Reports and backend-generated CSV-export contract. */
export interface ReportsService {
  getReport(query: ReportQuery): Promise<ReportData>;
  exportReport(request: ReportExportRequest): Promise<ReportExportResult>;
}

/** The small shared-client surface required by the Reports HTTP adapter. */
export interface ReportsApiClient {
  get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse>;
  getWithResponse<TResponse>(
    path: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<TResponse>>;
}

type DecimalWireValue = number | string;

type DateRangeWire = {
  readonly date_from: string | null;
  readonly date_to: string | null;
};

type ModelPerformanceMetricRowWire = {
  readonly forecast_run_id: string;
  readonly status: string;
  readonly horizon_days: number;
  readonly requested_at: string;
  readonly completed_at: string | null;
  readonly model_name: string;
  readonly mae: DecimalWireValue | null;
  readonly rmse: DecimalWireValue | null;
  readonly mape: DecimalWireValue | null;
  readonly training_rows: number;
  readonly validation_rows: number;
  readonly total_products: number;
  readonly fallback_products: number;
  readonly created_at: string;
};

type ModelPerformanceReportWire = {
  readonly report_name: string;
  readonly generated_at: string;
  readonly date_range: DateRangeWire;
  readonly total_forecast_runs: number;
  readonly completed_forecast_runs: number;
  readonly failed_forecast_runs: number;
  readonly average_mae: DecimalWireValue | null;
  readonly average_rmse: DecimalWireValue | null;
  readonly average_mape: DecimalWireValue | null;
  readonly best_run_by_mape: ModelPerformanceMetricRowWire | null;
  readonly latest_run_metrics: ModelPerformanceMetricRowWire | null;
  readonly rows: readonly ModelPerformanceMetricRowWire[];
};

type InventoryRiskReportRowWire = {
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly current_stock: DecimalWireValue;
  readonly minimum_stock: DecimalWireValue;
  readonly safety_stock: DecimalWireValue;
  readonly stock_status: string;
};

type InventoryRiskReportWire = {
  readonly report_name: string;
  readonly generated_at: string;
  readonly category_id: string | null;
  readonly stock_status: string | null;
  readonly total_inventory_items: number;
  readonly low_stock_count: number;
  readonly out_of_stock_count: number;
  readonly healthy_stock_count: number;
  readonly inactive_inventory_count: number;
  readonly rows: readonly InventoryRiskReportRowWire[];
};

type ReorderSummaryReportRowWire = {
  readonly id: string;
  readonly forecast_run_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly predicted_demand: DecimalWireValue;
  readonly current_stock: DecimalWireValue;
  readonly minimum_stock: DecimalWireValue;
  readonly safety_stock: DecimalWireValue;
  readonly required_stock: DecimalWireValue;
  readonly reorder_quantity: DecimalWireValue;
  readonly risk_level: string;
  readonly recommended_action: string;
  readonly status: string;
  readonly generated_at: string;
};

type ReorderSummaryReportWire = {
  readonly report_name: string;
  readonly generated_at: string;
  readonly forecast_run_id: string | null;
  readonly risk_level: string | null;
  readonly status: string | null;
  readonly total_recommendations: number;
  readonly open_recommendations: number;
  readonly acknowledged_recommendations: number;
  readonly dismissed_recommendations: number;
  readonly critical_count: number;
  readonly high_count: number;
  readonly medium_count: number;
  readonly low_count: number;
  readonly overstocked_count: number;
  readonly total_reorder_quantity: DecimalWireValue;
  readonly top_reorder_items: readonly ReorderSummaryReportRowWire[];
  readonly rows: readonly ReorderSummaryReportRowWire[];
};

type DemandForecastReportRowWire = {
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly forecast_date: string;
  readonly predicted_demand: DecimalWireValue;
  readonly model_name: string;
};

type DemandForecastReportWire = {
  readonly report_name: string;
  readonly generated_at: string;
  readonly forecast_run_id: string;
  readonly horizon_days: number;
  readonly forecast_date_range: DateRangeWire;
  readonly total_products: number;
  readonly total_predicted_demand: DecimalWireValue;
  readonly average_predicted_demand: DecimalWireValue;
  readonly rows: readonly DemandForecastReportRowWire[];
};

type SalesSummaryReportRowWire = {
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly total_quantity_sold: DecimalWireValue;
  readonly total_sales_amount: DecimalWireValue;
  readonly transaction_count: number;
  readonly average_transaction_amount: DecimalWireValue;
};

type SalesSummaryReportWire = {
  readonly report_name: string;
  readonly generated_at: string;
  readonly date_range: DateRangeWire;
  readonly product_id: string | null;
  readonly category_id: string | null;
  readonly channel: string | null;
  readonly total_transactions: number;
  readonly total_quantity_sold: DecimalWireValue;
  readonly total_sales_amount: DecimalWireValue;
  readonly unique_products_sold: number;
  readonly average_transaction_amount: DecimalWireValue;
  readonly rows: readonly SalesSummaryReportRowWire[];
};

const FORECAST_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
const STOCK_STATUSES = ['low_stock', 'out_of_stock', 'healthy', 'inactive'] as const;
const RISK_LEVELS = ['critical', 'high', 'medium', 'low', 'overstocked'] as const;
const RECOMMENDATION_STATUSES = ['open', 'acknowledged', 'dismissed'] as const;
const RECOMMENDED_ACTIONS = [
  'reorder_now',
  'monitor',
  'no_reorder_needed',
  'overstock_review',
] as const;

const REPORT_ENDPOINTS: Readonly<Record<ReportType, string>> = {
  model_performance: '/api/v1/reports/model-performance',
  inventory_risk: '/api/v1/reports/inventory-risk',
  reorder_summary: '/api/v1/reports/reorder-summary',
  demand_forecast: '/api/v1/reports/demand-forecast',
  sales_summary: '/api/v1/reports/sales-summary',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function isDecimalWireValue(value: unknown): value is DecimalWireValue {
  return typeof value === 'number' || typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === 'string' && allowed.includes(value as T[number]);
}

function isDateRangeWire(value: unknown): value is DateRangeWire {
  return (
    isRecord(value) &&
    isNullableString(value.date_from) &&
    isNullableString(value.date_to)
  );
}

function isModelPerformanceMetricRowWire(
  value: unknown,
): value is ModelPerformanceMetricRowWire {
  return (
    isRecord(value) &&
    typeof value.forecast_run_id === 'string' &&
    isOneOf(value.status, FORECAST_RUN_STATUSES) &&
    (value.horizon_days === 7 ||
      value.horizon_days === 15 ||
      value.horizon_days === 30) &&
    typeof value.requested_at === 'string' &&
    isNullableString(value.completed_at) &&
    typeof value.model_name === 'string' &&
    (value.mae === null || isDecimalWireValue(value.mae)) &&
    (value.rmse === null || isDecimalWireValue(value.rmse)) &&
    (value.mape === null || isDecimalWireValue(value.mape)) &&
    isFiniteInteger(value.training_rows) &&
    isFiniteInteger(value.validation_rows) &&
    isFiniteInteger(value.total_products) &&
    isFiniteInteger(value.fallback_products) &&
    typeof value.created_at === 'string'
  );
}

function isModelPerformanceReportWire(
  value: unknown,
): value is ModelPerformanceReportWire {
  return (
    isRecord(value) &&
    typeof value.report_name === 'string' &&
    typeof value.generated_at === 'string' &&
    isDateRangeWire(value.date_range) &&
    isFiniteInteger(value.total_forecast_runs) &&
    isFiniteInteger(value.completed_forecast_runs) &&
    isFiniteInteger(value.failed_forecast_runs) &&
    (value.average_mae === null || isDecimalWireValue(value.average_mae)) &&
    (value.average_rmse === null || isDecimalWireValue(value.average_rmse)) &&
    (value.average_mape === null || isDecimalWireValue(value.average_mape)) &&
    (value.best_run_by_mape === null ||
      isModelPerformanceMetricRowWire(value.best_run_by_mape)) &&
    (value.latest_run_metrics === null ||
      isModelPerformanceMetricRowWire(value.latest_run_metrics)) &&
    Array.isArray(value.rows) &&
    value.rows.every(isModelPerformanceMetricRowWire)
  );
}

function isInventoryRiskReportRowWire(
  value: unknown,
): value is InventoryRiskReportRowWire {
  return (
    isRecord(value) &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isDecimalWireValue(value.current_stock) &&
    isDecimalWireValue(value.minimum_stock) &&
    isDecimalWireValue(value.safety_stock) &&
    isOneOf(value.stock_status, STOCK_STATUSES)
  );
}

function isInventoryRiskReportWire(value: unknown): value is InventoryRiskReportWire {
  return (
    isRecord(value) &&
    typeof value.report_name === 'string' &&
    typeof value.generated_at === 'string' &&
    isNullableString(value.category_id) &&
    (value.stock_status === null || isOneOf(value.stock_status, STOCK_STATUSES)) &&
    isFiniteInteger(value.total_inventory_items) &&
    isFiniteInteger(value.low_stock_count) &&
    isFiniteInteger(value.out_of_stock_count) &&
    isFiniteInteger(value.healthy_stock_count) &&
    isFiniteInteger(value.inactive_inventory_count) &&
    Array.isArray(value.rows) &&
    value.rows.every(isInventoryRiskReportRowWire)
  );
}

function isReorderSummaryReportRowWire(
  value: unknown,
): value is ReorderSummaryReportRowWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.forecast_run_id === 'string' &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isDecimalWireValue(value.predicted_demand) &&
    isDecimalWireValue(value.current_stock) &&
    isDecimalWireValue(value.minimum_stock) &&
    isDecimalWireValue(value.safety_stock) &&
    isDecimalWireValue(value.required_stock) &&
    isDecimalWireValue(value.reorder_quantity) &&
    isOneOf(value.risk_level, RISK_LEVELS) &&
    isOneOf(value.recommended_action, RECOMMENDED_ACTIONS) &&
    isOneOf(value.status, RECOMMENDATION_STATUSES) &&
    typeof value.generated_at === 'string'
  );
}

function isReorderSummaryReportWire(value: unknown): value is ReorderSummaryReportWire {
  return (
    isRecord(value) &&
    typeof value.report_name === 'string' &&
    typeof value.generated_at === 'string' &&
    isNullableString(value.forecast_run_id) &&
    (value.risk_level === null || isOneOf(value.risk_level, RISK_LEVELS)) &&
    (value.status === null || isOneOf(value.status, RECOMMENDATION_STATUSES)) &&
    [
      'total_recommendations',
      'open_recommendations',
      'acknowledged_recommendations',
      'dismissed_recommendations',
      'critical_count',
      'high_count',
      'medium_count',
      'low_count',
      'overstocked_count',
    ].every((key) => isFiniteInteger(value[key])) &&
    isDecimalWireValue(value.total_reorder_quantity) &&
    Array.isArray(value.top_reorder_items) &&
    value.top_reorder_items.every(isReorderSummaryReportRowWire) &&
    Array.isArray(value.rows) &&
    value.rows.every(isReorderSummaryReportRowWire)
  );
}

function isDemandForecastReportRowWire(
  value: unknown,
): value is DemandForecastReportRowWire {
  return (
    isRecord(value) &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    typeof value.forecast_date === 'string' &&
    isDecimalWireValue(value.predicted_demand) &&
    typeof value.model_name === 'string'
  );
}

function isDemandForecastReportWire(value: unknown): value is DemandForecastReportWire {
  return (
    isRecord(value) &&
    typeof value.report_name === 'string' &&
    typeof value.generated_at === 'string' &&
    typeof value.forecast_run_id === 'string' &&
    (value.horizon_days === 7 ||
      value.horizon_days === 15 ||
      value.horizon_days === 30) &&
    isDateRangeWire(value.forecast_date_range) &&
    isFiniteInteger(value.total_products) &&
    isDecimalWireValue(value.total_predicted_demand) &&
    isDecimalWireValue(value.average_predicted_demand) &&
    Array.isArray(value.rows) &&
    value.rows.every(isDemandForecastReportRowWire)
  );
}

function isSalesSummaryReportRowWire(
  value: unknown,
): value is SalesSummaryReportRowWire {
  return (
    isRecord(value) &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isDecimalWireValue(value.total_quantity_sold) &&
    isDecimalWireValue(value.total_sales_amount) &&
    isFiniteInteger(value.transaction_count) &&
    isDecimalWireValue(value.average_transaction_amount)
  );
}

function isSalesSummaryReportWire(value: unknown): value is SalesSummaryReportWire {
  return (
    isRecord(value) &&
    typeof value.report_name === 'string' &&
    typeof value.generated_at === 'string' &&
    isDateRangeWire(value.date_range) &&
    isNullableString(value.product_id) &&
    isNullableString(value.category_id) &&
    isNullableString(value.channel) &&
    isFiniteInteger(value.total_transactions) &&
    isDecimalWireValue(value.total_quantity_sold) &&
    isDecimalWireValue(value.total_sales_amount) &&
    isFiniteInteger(value.unique_products_sold) &&
    isDecimalWireValue(value.average_transaction_amount) &&
    Array.isArray(value.rows) &&
    value.rows.every(isSalesSummaryReportRowWire)
  );
}

function invalidReportResponse(): ReportsServiceError {
  return new ReportsServiceError(
    'reports_unavailable',
    'The server returned an unexpected report response.',
  );
}

function mapDecimal(value: DecimalWireValue): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw invalidReportResponse();
  }
  return parsed;
}

function mapOptionalDecimal(value: DecimalWireValue | null): number | null {
  return value === null ? null : mapDecimal(value);
}

function mapModelPerformanceRow(row: ModelPerformanceMetricRowWire): ReportRow {
  return {
    id: row.forecast_run_id,
    cells: {
      forecastRunId: row.forecast_run_id,
      status: row.status,
      horizonDays: row.horizon_days,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      modelName: row.model_name,
      mae: mapOptionalDecimal(row.mae),
      rmse: mapOptionalDecimal(row.rmse),
      mape: mapOptionalDecimal(row.mape),
      trainingRows: row.training_rows,
      validationRows: row.validation_rows,
      totalProducts: row.total_products,
      fallbackProducts: row.fallback_products,
      createdAt: row.created_at,
    },
  };
}

/** Maps only the verified Model Performance response schema. */
export function mapModelPerformanceReportResponse(value: unknown): ReportData {
  if (!isModelPerformanceReportWire(value)) {
    throw invalidReportResponse();
  }
  return {
    reportType: 'model_performance',
    title: 'Model performance',
    description: 'Forecast run quality and model performance metrics.',
    generatedAt: value.generated_at,
    summary: [
      { label: 'Forecast runs', value: value.total_forecast_runs, format: 'number' },
      {
        label: 'Completed runs',
        value: value.completed_forecast_runs,
        format: 'number',
      },
      { label: 'Failed runs', value: value.failed_forecast_runs, format: 'number' },
      {
        label: 'Average MAE',
        value: mapOptionalDecimal(value.average_mae),
        format: 'number',
      },
      {
        label: 'Average RMSE',
        value: mapOptionalDecimal(value.average_rmse),
        format: 'number',
      },
      {
        label: 'Average MAPE',
        value: mapOptionalDecimal(value.average_mape),
        format: 'percentage',
      },
    ],
    columns: [
      { key: 'forecastRunId', label: 'Forecast run ID', format: 'text' },
      { key: 'status', label: 'Status', format: 'text' },
      { key: 'horizonDays', label: 'Horizon days', format: 'number' },
      { key: 'requestedAt', label: 'Requested', format: 'date' },
      { key: 'completedAt', label: 'Completed', format: 'date' },
      { key: 'modelName', label: 'Model', format: 'text' },
      { key: 'mae', label: 'MAE', format: 'number' },
      { key: 'rmse', label: 'RMSE', format: 'number' },
      { key: 'mape', label: 'MAPE', format: 'percentage' },
      { key: 'trainingRows', label: 'Training rows', format: 'number' },
      { key: 'validationRows', label: 'Validation rows', format: 'number' },
      { key: 'totalProducts', label: 'Products', format: 'number' },
      { key: 'fallbackProducts', label: 'Fallback products', format: 'number' },
    ],
    rows: value.rows.map(mapModelPerformanceRow),
  };
}

/** Maps only the verified Inventory Risk response schema. */
export function mapInventoryRiskReportResponse(value: unknown): ReportData {
  if (!isInventoryRiskReportWire(value)) {
    throw invalidReportResponse();
  }
  return {
    reportType: 'inventory_risk',
    title: 'Inventory risk',
    description: 'Current stock coverage and inventory health.',
    generatedAt: value.generated_at,
    summary: [
      {
        label: 'Inventory items',
        value: value.total_inventory_items,
        format: 'number',
      },
      { label: 'Out of stock', value: value.out_of_stock_count, format: 'number' },
      { label: 'Low stock', value: value.low_stock_count, format: 'number' },
      { label: 'Healthy stock', value: value.healthy_stock_count, format: 'number' },
      {
        label: 'Inactive inventory',
        value: value.inactive_inventory_count,
        format: 'number',
      },
    ],
    columns: [
      { key: 'productName', label: 'Product', format: 'text' },
      { key: 'sku', label: 'SKU', format: 'text' },
      { key: 'categoryName', label: 'Category', format: 'text' },
      { key: 'currentStock', label: 'Current stock', format: 'number' },
      { key: 'minimumStock', label: 'Minimum stock', format: 'number' },
      { key: 'safetyStock', label: 'Safety stock', format: 'number' },
      { key: 'stockStatus', label: 'Stock status', format: 'text' },
    ],
    rows: value.rows.map((row) => ({
      id: row.product_id,
      cells: {
        productName: row.product_name,
        sku: row.sku,
        categoryName: row.category_name,
        currentStock: mapDecimal(row.current_stock),
        minimumStock: mapDecimal(row.minimum_stock),
        safetyStock: mapDecimal(row.safety_stock),
        stockStatus: row.stock_status,
      },
    })),
  };
}

/** Maps only the verified Reorder Summary response schema. */
export function mapReorderSummaryReportResponse(value: unknown): ReportData {
  if (!isReorderSummaryReportWire(value)) {
    throw invalidReportResponse();
  }
  return {
    reportType: 'reorder_summary',
    title: 'Reorder summary',
    description: 'Backend-generated reorder decisions and risk.',
    generatedAt: value.generated_at,
    summary: [
      {
        label: 'Recommendations',
        value: value.total_recommendations,
        format: 'number',
      },
      { label: 'Open', value: value.open_recommendations, format: 'number' },
      {
        label: 'Acknowledged',
        value: value.acknowledged_recommendations,
        format: 'number',
      },
      { label: 'Dismissed', value: value.dismissed_recommendations, format: 'number' },
      { label: 'Critical risk', value: value.critical_count, format: 'number' },
      {
        label: 'Total reorder quantity',
        value: mapDecimal(value.total_reorder_quantity),
        format: 'number',
      },
    ],
    columns: [
      { key: 'productName', label: 'Product', format: 'text' },
      { key: 'sku', label: 'SKU', format: 'text' },
      { key: 'categoryName', label: 'Category', format: 'text' },
      { key: 'forecastRunId', label: 'Forecast run ID', format: 'text' },
      { key: 'predictedDemand', label: 'Predicted demand', format: 'number' },
      { key: 'currentStock', label: 'Current stock', format: 'number' },
      { key: 'requiredStock', label: 'Required stock', format: 'number' },
      { key: 'reorderQuantity', label: 'Reorder quantity', format: 'number' },
      { key: 'riskLevel', label: 'Risk level', format: 'text' },
      { key: 'recommendedAction', label: 'Recommended action', format: 'text' },
      { key: 'status', label: 'Status', format: 'text' },
      { key: 'generatedAt', label: 'Generated', format: 'date' },
    ],
    rows: value.rows.map((row) => ({
      id: row.id,
      cells: {
        productName: row.product_name,
        sku: row.sku,
        categoryName: row.category_name,
        forecastRunId: row.forecast_run_id,
        predictedDemand: mapDecimal(row.predicted_demand),
        currentStock: mapDecimal(row.current_stock),
        requiredStock: mapDecimal(row.required_stock),
        reorderQuantity: mapDecimal(row.reorder_quantity),
        riskLevel: row.risk_level,
        recommendedAction: row.recommended_action,
        status: row.status,
        generatedAt: row.generated_at,
      },
    })),
  };
}

/** Maps only the verified Demand Forecast response schema. */
export function mapDemandForecastReportResponse(value: unknown): ReportData {
  if (!isDemandForecastReportWire(value)) {
    throw invalidReportResponse();
  }
  return {
    reportType: 'demand_forecast',
    title: 'Demand forecast',
    description: 'Forecast output for one selected forecast run.',
    generatedAt: value.generated_at,
    summary: [
      { label: 'Forecast products', value: value.total_products, format: 'number' },
      {
        label: 'Total predicted demand',
        value: mapDecimal(value.total_predicted_demand),
        format: 'number',
      },
      {
        label: 'Average predicted demand',
        value: mapDecimal(value.average_predicted_demand),
        format: 'number',
      },
      { label: 'Horizon days', value: value.horizon_days, format: 'number' },
    ],
    columns: [
      { key: 'productName', label: 'Product', format: 'text' },
      { key: 'sku', label: 'SKU', format: 'text' },
      { key: 'categoryName', label: 'Category', format: 'text' },
      { key: 'forecastDate', label: 'Forecast date', format: 'date' },
      { key: 'predictedDemand', label: 'Predicted demand', format: 'number' },
      { key: 'modelName', label: 'Model', format: 'text' },
    ],
    rows: value.rows.map((row) => ({
      id: `${row.product_id}:${row.forecast_date}`,
      cells: {
        productName: row.product_name,
        sku: row.sku,
        categoryName: row.category_name,
        forecastDate: row.forecast_date,
        predictedDemand: mapDecimal(row.predicted_demand),
        modelName: row.model_name,
      },
    })),
  };
}

/** Maps only the verified Sales Summary response schema. */
export function mapSalesSummaryReportResponse(value: unknown): ReportData {
  if (!isSalesSummaryReportWire(value)) {
    throw invalidReportResponse();
  }
  return {
    reportType: 'sales_summary',
    title: 'Sales summary',
    description: 'Summarized sales activity by product.',
    generatedAt: value.generated_at,
    summary: [
      { label: 'Transactions', value: value.total_transactions, format: 'number' },
      {
        label: 'Quantity sold',
        value: mapDecimal(value.total_quantity_sold),
        format: 'number',
      },
      {
        label: 'Total sales',
        value: mapDecimal(value.total_sales_amount),
        format: 'currency',
      },
      { label: 'Products sold', value: value.unique_products_sold, format: 'number' },
      {
        label: 'Average sale',
        value: mapDecimal(value.average_transaction_amount),
        format: 'currency',
      },
    ],
    columns: [
      { key: 'productName', label: 'Product', format: 'text' },
      { key: 'sku', label: 'SKU', format: 'text' },
      { key: 'categoryName', label: 'Category', format: 'text' },
      { key: 'totalQuantitySold', label: 'Quantity sold', format: 'number' },
      { key: 'totalSalesAmount', label: 'Sales amount', format: 'currency' },
      { key: 'transactionCount', label: 'Transactions', format: 'number' },
      { key: 'averageTransactionAmount', label: 'Average sale', format: 'currency' },
    ],
    rows: value.rows.map((row) => ({
      id: row.product_id,
      cells: {
        productName: row.product_name,
        sku: row.sku,
        categoryName: row.category_name,
        totalQuantitySold: mapDecimal(row.total_quantity_sold),
        totalSalesAmount: mapDecimal(row.total_sales_amount),
        transactionCount: row.transaction_count,
        averageTransactionAmount: mapDecimal(row.average_transaction_amount),
      },
    })),
  };
}

function mapReportResponse(query: ReportQuery, value: unknown): ReportData {
  switch (query.reportType) {
    case 'model_performance':
      return mapModelPerformanceReportResponse(value);
    case 'inventory_risk':
      return mapInventoryRiskReportResponse(value);
    case 'reorder_summary':
      return mapReorderSummaryReportResponse(value);
    case 'demand_forecast':
      return mapDemandForecastReportResponse(value);
    case 'sales_summary':
      return mapSalesSummaryReportResponse(value);
  }
}

/** Returns the exact route selected by a report type; it is never a query parameter. */
export function getReportEndpoint(reportType: ReportType): string {
  return REPORT_ENDPOINTS[reportType];
}

/** Prunes unsupported query parameters again at the transport boundary. */
export function toReportsApiQuery(
  query: ReportQuery,
  format: 'json' | 'csv' = 'json',
): QueryParams {
  switch (query.reportType) {
    case 'model_performance':
      return {
        forecast_run_id: query.forecastRunId,
        date_from: query.dateFrom,
        date_to: query.dateTo,
        format,
      };
    case 'inventory_risk':
      return {
        category_id: query.categoryId,
        stock_status: query.stockStatus,
        format,
      };
    case 'reorder_summary':
      return {
        forecast_run_id: query.forecastRunId,
        risk_level: query.riskLevel,
        status: query.recommendationStatus,
        format,
      };
    case 'demand_forecast':
      if (query.forecastRunId === null) {
        throw new ReportsServiceError(
          'reports_unavailable',
          'A forecast run ID is required for the demand forecast report.',
        );
      }
      return {
        forecast_run_id: query.forecastRunId,
        product_id: query.productId,
        category_id: query.categoryId,
        date_from: query.dateFrom,
        date_to: query.dateTo,
        format,
      };
    case 'sales_summary':
      return {
        date_from: query.dateFrom,
        date_to: query.dateTo,
        product_id: query.productId,
        category_id: query.categoryId,
        channel: query.channel,
        format,
      };
  }
}

function isCsvContentType(contentType: string | null): boolean {
  return (
    contentType === null ||
    contentType.trim() === '' ||
    contentType.split(';', 1)[0]?.trim().toLowerCase() === 'text/csv'
  );
}

function sanitizeCsvFilename(value: string): string | null {
  const basename = value.trim().split(/[\\/]/u).at(-1) ?? '';
  const sanitized = basename
    .replace(/[<>:"|?*\u0000-\u001F]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();

  if (sanitized === '' || sanitized === '.' || sanitized === '..') {
    return null;
  }

  return sanitized.toLowerCase().endsWith('.csv') ? sanitized : `${sanitized}.csv`;
}

/** Reads a server filename defensively; unsafe or malformed values are ignored. */
export function filenameFromContentDisposition(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const encodedMatch = /filename\*\s*=\s*utf-8''([^;]+)/iu.exec(value);
  if (encodedMatch?.[1] !== undefined) {
    try {
      return sanitizeCsvFilename(decodeURIComponent(encodedMatch[1].trim()));
    } catch {
      return null;
    }
  }

  const quotedMatch = /filename\s*=\s*"([^"]*)"/iu.exec(value);
  if (quotedMatch?.[1] !== undefined) {
    return sanitizeCsvFilename(quotedMatch[1]);
  }

  const plainMatch = /filename\s*=\s*([^;\s]+)/iu.exec(value);
  return plainMatch?.[1] === undefined ? null : sanitizeCsvFilename(plainMatch[1]);
}

/** Deterministic fallback for cross-origin responses that cannot expose a filename header. */
export function getFallbackCsvFilename(
  reportType: ReportType,
  now = new Date(),
): string {
  return `invora_${reportType}_${now.toISOString().slice(0, 10)}.csv`;
}

export type CsvDownload = (blob: Blob, filename: string) => void;

/** Creates a browser download and always releases its object URL. */
export const downloadCsvBlob: CsvDownload = (blob, filename) => {
  if (
    typeof document === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    typeof URL.revokeObjectURL !== 'function'
  ) {
    throw new ReportsServiceError('export_unavailable', 'Unable to export report.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
};

/** Real FastAPI adapter for all authenticated JSON and CSV Reports endpoints. */
export function createHttpReportsService(
  client: ReportsApiClient = apiClient,
  download: CsvDownload = downloadCsvBlob,
): ReportsService {
  return {
    async getReport(query) {
      const data = await client.get<unknown>(getReportEndpoint(query.reportType), {
        query: toReportsApiQuery(query),
      });
      return mapReportResponse(query, data);
    },
    async exportReport(request) {
      const response = await client.getWithResponse<Blob>(
        getReportEndpoint(request.query.reportType),
        {
          query: toReportsApiQuery(request.query, request.format),
          responseFormat: 'blob',
        },
      );
      if (!isCsvContentType(response.headers.get('content-type'))) {
        throw new ReportsServiceError('export_unavailable', 'Unable to export report.');
      }
      const filename =
        filenameFromContentDisposition(response.headers.get('content-disposition')) ??
        getFallbackCsvFilename(request.query.reportType);
      download(response.data, filename);
      return { filename, contentType: 'text/csv' };
    },
  };
}

/** Test-only unavailable seam retained for focused failure-state coverage. */
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

/** Storage key read only by the Playwright-only Reports service below. */
export const REPORTS_E2E_STORAGE_KEY = 'invora-e2e-reports-fixture';

export type ReportsE2EFixture =
  | {
      readonly state: 'ready';
      readonly data: Readonly<Record<ReportType, ReportData>>;
    }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

function isReportData(value: unknown, reportType: ReportType): value is ReportData {
  return (
    isRecord(value) &&
    value.reportType === reportType &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isNullableString(value.generatedAt) &&
    Array.isArray(value.summary) &&
    Array.isArray(value.columns) &&
    Array.isArray(value.rows)
  );
}

function isE2EFixture(value: unknown): value is ReportsE2EFixture {
  if (!isRecord(value) || typeof value.state !== 'string') {
    return false;
  }
  if (value.state === 'empty' || value.state === 'error') {
    return true;
  }
  if (value.state !== 'ready' || !isRecord(value.data)) {
    return false;
  }
  const data = value.data;
  return REPORT_DEFINITIONS.every((definition) =>
    isReportData(data[definition.type], definition.type),
  );
}

function readE2EFixture(): ReportsE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'empty' };
  }
  const encodedFixture = window.sessionStorage.getItem(REPORTS_E2E_STORAGE_KEY);
  if (encodedFixture === null) {
    return { state: 'empty' };
  }
  try {
    const value: unknown = JSON.parse(encodedFixture);
    return isE2EFixture(value) ? value : { state: 'empty' };
  } catch {
    return { state: 'empty' };
  }
}

function emptyReportData(reportType: ReportType): ReportData {
  const definition = REPORT_DEFINITIONS.find((item) => item.type === reportType);
  return {
    reportType,
    title: definition?.label ?? 'Report',
    description: definition?.description ?? 'Backend-defined operational report.',
    generatedAt: null,
    summary: [],
    columns: [],
    rows: [],
  };
}

/** Deterministic adapter selected only by Playwright's explicit build flag. */
export function createE2EReportsService(): ReportsService {
  return {
    getReport(query) {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new ReportsServiceError('reports_unavailable', 'Unable to load report.'),
        );
      }
      return Promise.resolve(
        fixture.state === 'ready'
          ? fixture.data[query.reportType]
          : emptyReportData(query.reportType),
      );
    },
    exportReport(request) {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new ReportsServiceError('export_unavailable', 'Unable to export report.'),
        );
      }
      return Promise.resolve({
        filename: getFallbackCsvFilename(request.query.reportType),
        contentType: 'text/csv',
      });
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_REPORTS_E2E_TEST_MODE === 'true';

/** The single Reports service selected for the current frontend build. */
export const reportsService: ReportsService = isE2ETestMode
  ? createE2EReportsService()
  : createHttpReportsService();
