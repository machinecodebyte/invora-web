import { ReportsServiceError, type ReportsService } from '@/features/reports/api';
import type {
  ReportData,
  ReportExportRequest,
  ReportExportResult,
  ReportQuery,
  ReportType,
} from '@/features/reports/types';

export const REPORT_FORECAST_RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const SALES_SUMMARY_REPORT: ReportData = {
  reportType: 'sales_summary',
  title: 'Sales summary',
  description: 'Summarized sales activity by product.',
  generatedAt: '2026-09-15T09:00:00Z',
  summary: [
    { label: 'Transactions', value: 5, format: 'number' },
    { label: 'Quantity sold', value: 12, format: 'number' },
    { label: 'Total sales', value: 125.5, format: 'currency' },
    { label: 'Average sale', value: 25.1, format: 'currency' },
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
  rows: [
    {
      id: 'sales-1',
      cells: {
        productName: 'Northwind Tea',
        sku: 'TEA-001',
        categoryName: null,
        totalQuantitySold: 0,
        totalSalesAmount: 0,
        transactionCount: 0,
        averageTransactionAmount: null,
      },
    },
    {
      id: 'sales-2',
      cells: {
        productName: 'Northwind Coffee',
        sku: 'COF-002',
        categoryName: 'Beverages',
        totalQuantitySold: 12,
        totalSalesAmount: 125.5,
        transactionCount: 5,
        averageTransactionAmount: 25.1,
      },
    },
  ],
};

const INVENTORY_RISK_REPORT: ReportData = {
  reportType: 'inventory_risk',
  title: 'Inventory risk',
  description: 'Current stock coverage and inventory health.',
  generatedAt: '2026-09-15T09:00:00Z',
  summary: [
    { label: 'Products', value: 2, format: 'number' },
    { label: 'Out of stock', value: 1, format: 'number' },
    { label: 'Low stock', value: 0, format: 'number' },
  ],
  columns: [
    { key: 'productName', label: 'Product', format: 'text' },
    { key: 'sku', label: 'SKU', format: 'text' },
    { key: 'currentStock', label: 'Current stock', format: 'number' },
    { key: 'minimumStock', label: 'Minimum stock', format: 'number' },
    { key: 'safetyStock', label: 'Safety stock', format: 'number' },
    { key: 'stockStatus', label: 'Stock status', format: 'text' },
  ],
  rows: [
    {
      id: 'inventory-1',
      cells: {
        productName: 'Critical Widget',
        sku: 'CW-001',
        currentStock: 0,
        minimumStock: 8,
        safetyStock: 10,
        stockStatus: 'out_of_stock',
      },
    },
    {
      id: 'inventory-2',
      cells: {
        productName: 'Healthy Cable',
        sku: 'HC-002',
        currentStock: 32,
        minimumStock: 8,
        safetyStock: 10,
        stockStatus: 'healthy',
      },
    },
  ],
};

const REORDER_SUMMARY_REPORT: ReportData = {
  reportType: 'reorder_summary',
  title: 'Reorder summary',
  description: 'Backend-generated reorder decisions and risk.',
  generatedAt: '2026-09-15T09:00:00Z',
  summary: [
    { label: 'Recommendations', value: 2, format: 'number' },
    { label: 'Critical risk', value: 1, format: 'number' },
    { label: 'Total reorder quantity', value: 34, format: 'number' },
  ],
  columns: [
    { key: 'productName', label: 'Product', format: 'text' },
    { key: 'sku', label: 'SKU', format: 'text' },
    { key: 'predictedDemand', label: 'Predicted demand', format: 'number' },
    { key: 'currentStock', label: 'Current stock', format: 'number' },
    { key: 'reorderQuantity', label: 'Reorder quantity', format: 'number' },
    { key: 'riskLevel', label: 'Risk level', format: 'text' },
    { key: 'status', label: 'Status', format: 'text' },
  ],
  rows: [
    {
      id: 'reorder-1',
      cells: {
        productName: 'Critical Widget',
        sku: 'CW-001',
        predictedDemand: 34,
        currentStock: 0,
        reorderQuantity: 34,
        riskLevel: 'critical',
        status: 'open',
      },
    },
    {
      id: 'reorder-2',
      cells: {
        productName: 'Medium Cable',
        sku: 'MC-002',
        predictedDemand: 8,
        currentStock: 4,
        reorderQuantity: 4,
        riskLevel: 'medium',
        status: 'acknowledged',
      },
    },
  ],
};

const DEMAND_FORECAST_REPORT: ReportData = {
  reportType: 'demand_forecast',
  title: 'Demand forecast',
  description: 'Forecast output for one selected forecast run.',
  generatedAt: '2026-09-15T09:00:00Z',
  summary: [
    { label: 'Forecast products', value: 1, format: 'number' },
    { label: 'Forecast demand', value: 18.5, format: 'number' },
  ],
  columns: [
    { key: 'productName', label: 'Product', format: 'text' },
    { key: 'sku', label: 'SKU', format: 'text' },
    { key: 'forecastDate', label: 'Forecast date', format: 'date' },
    { key: 'predictedDemand', label: 'Predicted demand', format: 'number' },
    { key: 'modelName', label: 'Model', format: 'text' },
  ],
  rows: [
    {
      id: 'forecast-1',
      cells: {
        productName: 'Northwind Tea',
        sku: 'TEA-001',
        forecastDate: '2026-10-01',
        predictedDemand: 18.5,
        modelName: 'seasonal_naive',
      },
    },
  ],
};

const MODEL_PERFORMANCE_REPORT: ReportData = {
  reportType: 'model_performance',
  title: 'Model performance',
  description: 'Forecast run quality and model performance metrics.',
  generatedAt: '2026-09-15T09:00:00Z',
  summary: [
    { label: 'Forecast runs', value: 1, format: 'number' },
    { label: 'Average MAPE', value: 4.2, format: 'percentage' },
  ],
  columns: [
    { key: 'forecastRunId', label: 'Forecast run ID', format: 'text' },
    { key: 'status', label: 'Status', format: 'text' },
    { key: 'horizonDays', label: 'Horizon days', format: 'number' },
    { key: 'modelName', label: 'Model', format: 'text' },
    { key: 'mae', label: 'MAE', format: 'number' },
    { key: 'rmse', label: 'RMSE', format: 'number' },
    { key: 'mape', label: 'MAPE', format: 'percentage' },
  ],
  rows: [
    {
      id: 'performance-1',
      cells: {
        forecastRunId: REPORT_FORECAST_RUN_ID,
        status: 'completed',
        horizonDays: 15,
        modelName: 'seasonal_naive',
        mae: 2.1,
        rmse: 2.8,
        mape: 4.2,
      },
    },
  ],
};

const REPORTS_BY_TYPE: Readonly<Record<ReportType, ReportData>> = {
  sales_summary: SALES_SUMMARY_REPORT,
  inventory_risk: INVENTORY_RISK_REPORT,
  reorder_summary: REORDER_SUMMARY_REPORT,
  demand_forecast: DEMAND_FORECAST_REPORT,
  model_performance: MODEL_PERFORMANCE_REPORT,
};

/** Complete deterministic data set used only by the Playwright Reports fixture. */
export const REPORTS_E2E_DATA: Readonly<Record<ReportType, ReportData>> =
  REPORTS_BY_TYPE;

function rowsForQuery(report: ReportData, query: ReportQuery): ReportData {
  let rows = report.rows;
  if (query.reportType === 'reorder_summary' && query.riskLevel !== null) {
    rows = rows.filter((row) => row.cells.riskLevel === query.riskLevel);
  }
  if (query.reportType === 'reorder_summary' && query.recommendationStatus !== null) {
    rows = rows.filter((row) => row.cells.status === query.recommendationStatus);
  }
  if (query.reportType === 'inventory_risk' && query.stockStatus !== null) {
    rows = rows.filter((row) => row.cells.stockStatus === query.stockStatus);
  }
  if (query.reportType === 'sales_summary' && query.channel === 'No matching channel') {
    rows = [];
  }
  return { ...report, rows };
}

export interface ReportsTestServiceOptions {
  readonly data?: Partial<Readonly<Record<ReportType, ReportData>>> | undefined;
  readonly getReportError?: Error | undefined;
  readonly exportError?: Error | undefined;
  readonly exportResult?: Promise<ReportExportResult> | undefined;
}

/** Deterministic test-only Reports adapter; never selected by production code. */
export function createReportsTestService(
  options: ReportsTestServiceOptions = {},
): ReportsService {
  const reports = { ...REPORTS_BY_TYPE, ...options.data };
  return {
    getReport: (query) => {
      if (options.getReportError !== undefined) {
        return Promise.reject(options.getReportError);
      }
      const report = reports[query.reportType];
      if (report === undefined) {
        return Promise.reject(
          new ReportsServiceError('reports_unavailable', 'Unable to load report.'),
        );
      }
      return Promise.resolve(rowsForQuery(report, query));
    },
    exportReport: (_request: ReportExportRequest) => {
      if (options.exportError !== undefined) {
        return Promise.reject(options.exportError);
      }
      return (
        options.exportResult ??
        Promise.resolve({
          filename: 'invora_sales_summary_2026-09-15.csv',
          contentType: 'text/csv',
        })
      );
    },
  };
}

export function reportWithNoRows(reportType: ReportType): ReportData {
  const report = REPORTS_BY_TYPE[reportType];
  return { ...report, rows: [] };
}
