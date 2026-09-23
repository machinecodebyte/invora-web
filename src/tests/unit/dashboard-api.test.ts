import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_E2E_STORAGE_KEY,
  DashboardServiceError,
  createE2EDashboardService,
  createHttpDashboardService,
  createUnavailableDashboardService,
  mapDashboardSummaryResponse,
} from '@/features/dashboard/api';
import { ApiClient } from '@/lib/api-client';
import { DASHBOARD_SUMMARY_FIXTURE } from '@/tests/fixtures/dashboard';

const DASHBOARD_SUMMARY_WIRE = {
  date_from: '2026-09-01',
  date_to: '2026-09-23',
  forecast_run_id: null,
  kpis: {
    total_products: 3,
    active_products: 2,
    total_sales_records: 7,
    total_inventory_items: 3,
    low_stock_count: 1,
    out_of_stock_count: 1,
    total_forecast_runs: 2,
    completed_forecast_runs: 1,
    latest_forecast_mape: '12.3400',
    open_recommendations: 2,
    high_risk_recommendations: 1,
    critical_risk_recommendations: 1,
    total_reorder_quantity: '14.000',
  },
  demand_trends: {
    date_from: '2026-09-01',
    date_to: '2026-09-23',
    interval: 'day',
    product_id: null,
    category_id: null,
    points: [
      {
        period: '2026-09-23',
        total_quantity_sold: '3.500',
        total_sales_amount: '43.75',
        transaction_count: 2,
      },
    ],
  },
  inventory_risk: {
    total_inventory_items: 3,
    low_stock_count: 1,
    out_of_stock_count: 1,
    healthy_stock_count: 1,
    inactive_inventory_count: 0,
    low_stock_items: [
      {
        product_id: 'product-low',
        product_name: 'Low Rice',
        sku: 'LOW-RICE',
        category_id: null,
        category_name: null,
        current_stock: '2.000',
        minimum_stock: '5.000',
        safety_stock: '1.000',
        stock_status: 'low_stock',
      },
    ],
    out_of_stock_items: [
      {
        product_id: 'product-out',
        product_name: 'Out Flour',
        sku: 'OUT-FLOUR',
        category_id: 'category-staples',
        category_name: 'Staples',
        current_stock: '0.000',
        minimum_stock: '5.000',
        safety_stock: '1.000',
        stock_status: 'out_of_stock',
      },
    ],
  },
  forecast_overview: {
    latest_forecast_run: null,
    latest_completed_forecast_run: null,
    forecast_run_counts_by_status: {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },
    latest_metrics: null,
    total_predictions_in_latest_run: 0,
    forecast_date_range: { date_from: null, date_to: null },
    total_predicted_demand: '0.000',
  },
  reorder_alerts: {
    forecast_run_id: null,
    risk_level: null,
    status: 'open',
    critical_count: 1,
    high_count: 1,
    medium_count: 0,
    low_count: 0,
    overstocked_count: 0,
    open_count: 2,
    acknowledged_count: 0,
    dismissed_count: 0,
    total_reorder_quantity: '14.000',
    top_reorder_items: [
      {
        id: 'recommendation-critical',
        forecast_run_id: 'forecast-1',
        product_id: 'product-out',
        product_name: 'Out Flour',
        sku: 'OUT-FLOUR',
        category_id: 'category-staples',
        category_name: 'Staples',
        predicted_demand: '5.000',
        current_stock: '0.000',
        required_stock: '5.000',
        reorder_quantity: '5.000',
        risk_level: 'critical',
        recommended_action: 'reorder_now',
        status: 'open',
        generated_at: '2026-09-23T10:00:00Z',
      },
    ],
  },
  recent_activity: { activities: [], limit: 8 },
} as const;

function success(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Dashboard Summary service adapters', () => {
  it('uses the authenticated summary endpoint without inventing date filters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(success(DASHBOARD_SUMMARY_WIRE));
    const service = createHttpDashboardService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        getAccessToken: () => 'access-token',
        fetchImpl,
      }),
    );

    await expect(service.getDashboardSummary()).resolves.toMatchObject({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-23',
      kpis: { latestForecastMape: 12.34, totalReorderQuantity: 14 },
      demandTrends: {
        interval: 'day',
        points: [{ period: '2026-09-23', totalQuantitySold: 3.5 }],
      },
      inventoryRisk: { lowStockItems: [{ currentStock: 2 }] },
      reorderAlerts: { topReorderItems: [{ riskLevel: 'critical' }] },
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/dashboard/summary',
    );
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe('GET');
    expect((request.headers as Headers).get('Authorization')).toBe(
      'Bearer access-token',
    );
  });

  it('maps rendered sections while intentionally leaving unrendered summary sections out of the Module 2 view model', () => {
    const summary = mapDashboardSummaryResponse(DASHBOARD_SUMMARY_WIRE);

    expect(summary).toEqual({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-23',
      kpis: {
        totalProducts: 3,
        activeProducts: 2,
        totalSalesRecords: 7,
        totalInventoryItems: 3,
        lowStockCount: 1,
        outOfStockCount: 1,
        totalForecastRuns: 2,
        completedForecastRuns: 1,
        latestForecastMape: 12.34,
        openRecommendations: 2,
        highRiskRecommendations: 1,
        criticalRiskRecommendations: 1,
        totalReorderQuantity: 14,
      },
      demandTrends: {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-23',
        interval: 'day',
        points: [
          {
            period: '2026-09-23',
            totalQuantitySold: 3.5,
            totalSalesAmount: 43.75,
            transactionCount: 2,
          },
        ],
      },
      inventoryRisk: {
        totalInventoryItems: 3,
        lowStockCount: 1,
        outOfStockCount: 1,
        healthyStockCount: 1,
        inactiveInventoryCount: 0,
        lowStockItems: [
          {
            productId: 'product-low',
            productName: 'Low Rice',
            sku: 'LOW-RICE',
            categoryId: null,
            categoryName: null,
            currentStock: 2,
            minimumStock: 5,
            safetyStock: 1,
            stockStatus: 'low_stock',
          },
        ],
        outOfStockItems: [
          {
            productId: 'product-out',
            productName: 'Out Flour',
            sku: 'OUT-FLOUR',
            categoryId: 'category-staples',
            categoryName: 'Staples',
            currentStock: 0,
            minimumStock: 5,
            safetyStock: 1,
            stockStatus: 'out_of_stock',
          },
        ],
      },
      reorderAlerts: {
        criticalCount: 1,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        overstockedCount: 0,
        openCount: 2,
        totalReorderQuantity: 14,
        topReorderItems: [
          {
            id: 'recommendation-critical',
            productId: 'product-out',
            productName: 'Out Flour',
            sku: 'OUT-FLOUR',
            categoryId: 'category-staples',
            categoryName: 'Staples',
            predictedDemand: 5,
            currentStock: 0,
            requiredStock: 5,
            reorderQuantity: 5,
            riskLevel: 'critical',
            recommendedAction: 'reorder_now',
            generatedAt: '2026-09-23T10:00:00Z',
          },
        ],
      },
    });
    expect(summary).not.toHaveProperty('forecastOverview');
    expect(summary).not.toHaveProperty('recentActivity');
  });

  it('preserves date-only dashboard fields and accepts legitimate empty summary sections', () => {
    const summary = mapDashboardSummaryResponse({
      ...DASHBOARD_SUMMARY_WIRE,
      kpis: { ...DASHBOARD_SUMMARY_WIRE.kpis, latest_forecast_mape: null },
      demand_trends: { ...DASHBOARD_SUMMARY_WIRE.demand_trends, points: [] },
      inventory_risk: {
        ...DASHBOARD_SUMMARY_WIRE.inventory_risk,
        low_stock_items: [],
        out_of_stock_items: [],
      },
      reorder_alerts: {
        ...DASHBOARD_SUMMARY_WIRE.reorder_alerts,
        top_reorder_items: [],
      },
    });

    expect(summary.dateFrom).toBe('2026-09-01');
    expect(summary.demandTrends.dateTo).toBe('2026-09-23');
    expect(summary.demandTrends.points).toEqual([]);
    expect(summary.kpis.latestForecastMape).toBeNull();
  });

  it('fails safely when a rendered Decimal-compatible value is invalid', () => {
    expect(() =>
      mapDashboardSummaryResponse({
        ...DASHBOARD_SUMMARY_WIRE,
        kpis: { ...DASHBOARD_SUMMARY_WIRE.kpis, total_reorder_quantity: 'NaN' },
      }),
    ).toThrow('The server returned an unexpected dashboard response.');
  });

  it('propagates the shared safe API failure without a Dashboard-specific fetch wrapper', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'dashboard_aggregation_failed', message: 'Try again later.' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const service = createHttpDashboardService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(service.getDashboardSummary()).rejects.toMatchObject({
      code: 'dashboard_aggregation_failed',
      message: 'Try again later.',
    });
  });
});

describe('Dashboard test-only service seams', () => {
  it('keeps the unavailable seam network-free', async () => {
    await expect(
      createUnavailableDashboardService().getDashboardSummary(),
    ).resolves.toBeNull();
  });

  it('reads a ready projection only from the Playwright test fixture channel', async () => {
    window.sessionStorage.setItem(
      DASHBOARD_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'ready', data: DASHBOARD_SUMMARY_FIXTURE }),
    );

    await expect(createE2EDashboardService().getDashboardSummary()).resolves.toEqual(
      DASHBOARD_SUMMARY_FIXTURE,
    );
  });

  it('normalizes the test-only failure mode to a safe dashboard error', async () => {
    window.sessionStorage.setItem(
      DASHBOARD_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'error' }),
    );

    await expect(createE2EDashboardService().getDashboardSummary()).rejects.toEqual(
      new DashboardServiceError(
        'dashboard_unavailable',
        'Unable to load dashboard data.',
      ),
    );
  });

  it('treats malformed test-only state as unavailable instead of crashing', async () => {
    window.sessionStorage.setItem(DASHBOARD_E2E_STORAGE_KEY, '{not-json');

    await expect(createE2EDashboardService().getDashboardSummary()).resolves.toBeNull();
  });
});
