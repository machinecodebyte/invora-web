import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createHttpReportsService,
  downloadCsvBlob,
  filenameFromContentDisposition,
  getFallbackCsvFilename,
  getReportEndpoint,
  mapDemandForecastReportResponse,
  mapInventoryRiskReportResponse,
  mapModelPerformanceReportResponse,
  mapReorderSummaryReportResponse,
  mapSalesSummaryReportResponse,
  toReportsApiQuery,
  type ReportsApiClient,
} from '@/features/reports/api';
import type { ApiResponse, RequestConfig } from '@/lib/api-client';
import type { ReportQuery } from '@/features/reports/types';

const FORECAST_RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PRODUCT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const MODEL_ROW = {
  forecast_run_id: FORECAST_RUN_ID,
  status: 'completed',
  horizon_days: 15,
  requested_at: '2026-09-01T08:00:00Z',
  completed_at: '2026-09-01T09:00:00Z',
  model_name: 'seasonal_naive',
  mae: '1.25',
  rmse: '2.5',
  mape: '4.2',
  training_rows: 50,
  validation_rows: 10,
  total_products: 3,
  fallback_products: 0,
  created_at: '2026-09-01T08:00:00Z',
};

const MODEL_PERFORMANCE_WIRE = {
  report_name: 'model_performance',
  generated_at: '2026-09-15T09:00:00Z',
  date_range: { date_from: '2026-09-01', date_to: '2026-09-15' },
  total_forecast_runs: 2,
  completed_forecast_runs: 1,
  failed_forecast_runs: 1,
  average_mae: '1.25',
  average_rmse: '2.5',
  average_mape: '4.2',
  best_run_by_mape: MODEL_ROW,
  latest_run_metrics: MODEL_ROW,
  rows: [MODEL_ROW],
};

const INVENTORY_RISK_WIRE = {
  report_name: 'inventory_risk',
  generated_at: '2026-09-15T09:00:00Z',
  category_id: null,
  stock_status: null,
  total_inventory_items: 1,
  low_stock_count: 1,
  out_of_stock_count: 0,
  healthy_stock_count: 0,
  inactive_inventory_count: 0,
  rows: [
    {
      product_id: PRODUCT_ID,
      product_name: 'Critical Widget',
      sku: 'CW-001',
      category_id: CATEGORY_ID,
      category_name: 'Widgets',
      current_stock: '3',
      minimum_stock: '8',
      safety_stock: '10',
      stock_status: 'low_stock',
    },
  ],
};

const REORDER_ROW = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  forecast_run_id: FORECAST_RUN_ID,
  product_id: PRODUCT_ID,
  product_name: 'Critical Widget',
  sku: 'CW-001',
  category_id: CATEGORY_ID,
  category_name: 'Widgets',
  predicted_demand: '24',
  current_stock: '3',
  minimum_stock: '8',
  safety_stock: '10',
  required_stock: '24',
  reorder_quantity: '21',
  risk_level: 'critical',
  recommended_action: 'reorder_now',
  status: 'open',
  generated_at: '2026-09-15T09:00:00Z',
};

const REORDER_SUMMARY_WIRE = {
  report_name: 'reorder_summary',
  generated_at: '2026-09-15T09:00:00Z',
  forecast_run_id: FORECAST_RUN_ID,
  risk_level: 'critical',
  status: 'open',
  total_recommendations: 1,
  open_recommendations: 1,
  acknowledged_recommendations: 0,
  dismissed_recommendations: 0,
  critical_count: 1,
  high_count: 0,
  medium_count: 0,
  low_count: 0,
  overstocked_count: 0,
  total_reorder_quantity: '21',
  top_reorder_items: [REORDER_ROW],
  rows: [REORDER_ROW],
};

const DEMAND_FORECAST_WIRE = {
  report_name: 'demand_forecast',
  generated_at: '2026-09-15T09:00:00Z',
  forecast_run_id: FORECAST_RUN_ID,
  horizon_days: 15,
  forecast_date_range: { date_from: '2026-10-01', date_to: '2026-10-15' },
  total_products: 1,
  total_predicted_demand: '24',
  average_predicted_demand: '1.6',
  rows: [
    {
      product_id: PRODUCT_ID,
      product_name: 'Critical Widget',
      sku: 'CW-001',
      category_id: CATEGORY_ID,
      category_name: 'Widgets',
      forecast_date: '2026-10-01',
      predicted_demand: '1.6',
      model_name: 'seasonal_naive',
    },
  ],
};

const SALES_SUMMARY_WIRE = {
  report_name: 'sales_summary',
  generated_at: '2026-09-15T09:00:00Z',
  date_range: { date_from: '2026-08-16', date_to: '2026-09-15' },
  product_id: null,
  category_id: null,
  channel: null,
  total_transactions: 5,
  total_quantity_sold: '12',
  total_sales_amount: '125.5',
  unique_products_sold: 1,
  average_transaction_amount: '25.1',
  rows: [
    {
      product_id: PRODUCT_ID,
      product_name: 'Critical Widget',
      sku: 'CW-001',
      category_id: CATEGORY_ID,
      category_name: 'Widgets',
      total_quantity_sold: '12',
      total_sales_amount: '125.5',
      transaction_count: 5,
      average_transaction_amount: '25.1',
    },
  ],
};

function queryFor(reportType: ReportQuery['reportType']): ReportQuery {
  return {
    reportType,
    dateFrom: '2026-09-01',
    dateTo: '2026-09-15',
    forecastRunId: FORECAST_RUN_ID,
    productId: PRODUCT_ID,
    categoryId: CATEGORY_ID,
    channel: 'retail',
    riskLevel: 'critical',
    recommendationStatus: 'open',
    stockStatus: 'low_stock',
  };
}

function createClient(
  data: unknown,
  headers = new Headers(),
): {
  readonly client: ReportsApiClient;
  readonly calls: Array<{
    readonly path: string;
    readonly config: RequestConfig | undefined;
  }>;
} {
  const calls: Array<{ path: string; config: RequestConfig | undefined }> = [];
  const csvBlob = new Blob(['product_id,product_name\n'], { type: 'text/csv' });
  const client: ReportsApiClient = {
    get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse> {
      calls.push({ path, config });
      return Promise.resolve(data as TResponse);
    },
    getWithResponse<TResponse>(
      path: string,
      config?: RequestConfig,
    ): Promise<ApiResponse<TResponse>> {
      calls.push({ path, config });
      return Promise.resolve({
        data: csvBlob as unknown as TResponse,
        headers,
        status: 200,
      });
    },
  };
  return { client, calls };
}

describe('Reports HTTP route and query contract', () => {
  it('selects a report route and sends only its supported query parameters', () => {
    expect(getReportEndpoint('model_performance')).toBe(
      '/api/v1/reports/model-performance',
    );
    expect(toReportsApiQuery(queryFor('model_performance'))).toEqual({
      forecast_run_id: FORECAST_RUN_ID,
      date_from: '2026-09-01',
      date_to: '2026-09-15',
      format: 'json',
    });

    expect(getReportEndpoint('inventory_risk')).toBe('/api/v1/reports/inventory-risk');
    expect(toReportsApiQuery(queryFor('inventory_risk'))).toEqual({
      category_id: CATEGORY_ID,
      stock_status: 'low_stock',
      format: 'json',
    });

    expect(getReportEndpoint('reorder_summary')).toBe(
      '/api/v1/reports/reorder-summary',
    );
    expect(toReportsApiQuery(queryFor('reorder_summary'))).toEqual({
      forecast_run_id: FORECAST_RUN_ID,
      risk_level: 'critical',
      status: 'open',
      format: 'json',
    });

    expect(getReportEndpoint('demand_forecast')).toBe(
      '/api/v1/reports/demand-forecast',
    );
    expect(toReportsApiQuery(queryFor('demand_forecast'))).toEqual({
      forecast_run_id: FORECAST_RUN_ID,
      product_id: PRODUCT_ID,
      category_id: CATEGORY_ID,
      date_from: '2026-09-01',
      date_to: '2026-09-15',
      format: 'json',
    });

    expect(getReportEndpoint('sales_summary')).toBe('/api/v1/reports/sales-summary');
    expect(toReportsApiQuery(queryFor('sales_summary'))).toEqual({
      date_from: '2026-09-01',
      date_to: '2026-09-15',
      product_id: PRODUCT_ID,
      category_id: CATEGORY_ID,
      channel: 'retail',
      format: 'json',
    });
  });

  it('requires a forecast run before a demand forecast request can reach transport', () => {
    expect(() =>
      toReportsApiQuery({ ...queryFor('demand_forecast'), forecastRunId: null }),
    ).toThrow('A forecast run ID is required for the demand forecast report.');
  });
});

describe('Reports schema-specific mappers', () => {
  it('maps each verified backend report schema independently', () => {
    const model = mapModelPerformanceReportResponse(MODEL_PERFORMANCE_WIRE);
    expect(model.rows[0]?.cells).toMatchObject({ mae: 1.25, mape: 4.2 });
    expect(model.summary).toContainEqual({
      label: 'Failed runs',
      value: 1,
      format: 'number',
    });

    const inventory = mapInventoryRiskReportResponse(INVENTORY_RISK_WIRE);
    expect(inventory.rows[0]?.cells).toMatchObject({
      currentStock: 3,
      categoryName: 'Widgets',
      stockStatus: 'low_stock',
    });

    const reorder = mapReorderSummaryReportResponse(REORDER_SUMMARY_WIRE);
    expect(reorder.rows[0]?.cells).toMatchObject({
      reorderQuantity: 21,
      recommendedAction: 'reorder_now',
    });

    const forecast = mapDemandForecastReportResponse(DEMAND_FORECAST_WIRE);
    expect(forecast.rows[0]?.id).toBe(`${PRODUCT_ID}:2026-10-01`);
    expect(forecast.summary).toContainEqual({
      label: 'Horizon days',
      value: 15,
      format: 'number',
    });

    const sales = mapSalesSummaryReportResponse(SALES_SUMMARY_WIRE);
    expect(sales.rows[0]?.cells).toMatchObject({
      totalSalesAmount: 125.5,
      averageTransactionAmount: 25.1,
    });
  });

  it('rejects malformed numeric report data instead of rendering an invented value', () => {
    expect(() =>
      mapSalesSummaryReportResponse({
        ...SALES_SUMMARY_WIRE,
        total_sales_amount: 'not-a-decimal',
      }),
    ).toThrow('unexpected report response');
  });
});

describe('Reports HTTP adapter and CSV export', () => {
  it('uses the shared authenticated client for JSON data and maps its response', async () => {
    const { client, calls } = createClient(SALES_SUMMARY_WIRE);
    const service = createHttpReportsService(client, vi.fn());

    await expect(service.getReport(queryFor('sales_summary'))).resolves.toMatchObject({
      reportType: 'sales_summary',
      title: 'Sales summary',
    });
    expect(calls).toEqual([
      {
        path: '/api/v1/reports/sales-summary',
        config: {
          query: {
            date_from: '2026-09-01',
            date_to: '2026-09-15',
            product_id: PRODUCT_ID,
            category_id: CATEGORY_ID,
            channel: 'retail',
            format: 'json',
          },
        },
      },
    ]);
  });

  it('exports CSV through the same endpoint, uses a safe attachment filename, and passes a Blob to the browser boundary', async () => {
    const { client, calls } = createClient(
      SALES_SUMMARY_WIRE,
      new Headers({
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="sales-summary.csv"',
      }),
    );
    const download = vi.fn();
    const service = createHttpReportsService(client, download);

    await expect(
      service.exportReport({ query: queryFor('sales_summary'), format: 'csv' }),
    ).resolves.toEqual({ filename: 'sales-summary.csv', contentType: 'text/csv' });
    expect(calls[0]).toEqual({
      path: '/api/v1/reports/sales-summary',
      config: {
        query: {
          date_from: '2026-09-01',
          date_to: '2026-09-15',
          product_id: PRODUCT_ID,
          category_id: CATEGORY_ID,
          channel: 'retail',
          format: 'csv',
        },
        responseFormat: 'blob',
      },
    });
    expect(download).toHaveBeenCalledWith(expect.any(Blob), 'sales-summary.csv');
  });

  it('uses a deterministic fallback when Content-Disposition cannot be exposed cross-origin', async () => {
    const { client } = createClient(
      SALES_SUMMARY_WIRE,
      new Headers({ 'content-type': 'text/csv' }),
    );
    const download = vi.fn();
    const service = createHttpReportsService(client, download);

    await expect(
      service.exportReport({ query: queryFor('inventory_risk'), format: 'csv' }),
    ).resolves.toMatchObject({
      filename: expect.stringMatching(
        /^invora_inventory_risk_\d{4}-\d{2}-\d{2}\.csv$/u,
      ),
    });
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('never invokes the browser download boundary for a non-CSV success payload', async () => {
    const { client } = createClient(
      SALES_SUMMARY_WIRE,
      new Headers({ 'content-type': 'text/html' }),
    );
    const download = vi.fn();
    const service = createHttpReportsService(client, download);

    await expect(
      service.exportReport({ query: queryFor('sales_summary'), format: 'csv' }),
    ).rejects.toMatchObject({ code: 'export_unavailable' });
    expect(download).not.toHaveBeenCalled();
  });
});

describe('CSV filename and object URL safety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes supported server filenames and rejects malformed input', () => {
    expect(
      filenameFromContentDisposition(
        "attachment; filename*=UTF-8''invora%20sales%20summary.csv",
      ),
    ).toBe('invora sales summary.csv');
    expect(
      filenameFromContentDisposition('attachment; filename="../../unsafe.csv"'),
    ).toBe('unsafe.csv');
    expect(
      filenameFromContentDisposition("attachment; filename*=UTF-8''%E0%A4"),
    ).toBeNull();
    expect(
      getFallbackCsvFilename('sales_summary', new Date('2026-09-15T00:00:00Z')),
    ).toBe('invora_sales_summary_2026-09-15.csv');
  });

  it('removes the temporary anchor and revokes every object URL after download click', () => {
    const createObjectUrl = vi.fn(() => 'blob:reports-export');
    const revokeObjectUrl = vi.fn();
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      downloadCsvBlob(new Blob(['report']), 'invora_sales_summary.csv');
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:reports-export');
      expect(
        document.querySelector('a[download="invora_sales_summary.csv"]'),
      ).toBeNull();
    } finally {
      if (createDescriptor === undefined) {
        Reflect.deleteProperty(URL, 'createObjectURL');
      } else {
        Object.defineProperty(URL, 'createObjectURL', createDescriptor);
      }
      if (revokeDescriptor === undefined) {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      } else {
        Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
      }
    }
  });
});
