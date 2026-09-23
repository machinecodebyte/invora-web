import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { createHttpDashboardService } from '@/features/dashboard/api';
import { ApiClient } from '@/lib/api-client';
import { TEST_API_BASE_URL } from '@/tests/mocks/handlers';
import { server } from '@/tests/mocks/server';

function dashboardSummaryWire() {
  return {
    date_from: '2026-09-01',
    date_to: '2026-09-23',
    forecast_run_id: null,
    kpis: {
      total_products: 0,
      active_products: 0,
      total_sales_records: 0,
      total_inventory_items: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      total_forecast_runs: 0,
      completed_forecast_runs: 0,
      latest_forecast_mape: null,
      open_recommendations: 0,
      high_risk_recommendations: 0,
      critical_risk_recommendations: 0,
      total_reorder_quantity: '0.000',
    },
    demand_trends: {
      date_from: '2026-09-01',
      date_to: '2026-09-23',
      interval: 'day',
      product_id: null,
      category_id: null,
      points: [],
    },
    inventory_risk: {
      total_inventory_items: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      healthy_stock_count: 0,
      inactive_inventory_count: 0,
      low_stock_items: [],
      out_of_stock_items: [],
    },
    forecast_overview: {
      latest_forecast_run: null,
      latest_completed_forecast_run: null,
      forecast_run_counts_by_status: {},
      latest_metrics: null,
      total_predictions_in_latest_run: 0,
      forecast_date_range: { date_from: null, date_to: null },
      total_predicted_demand: '0.000',
    },
    reorder_alerts: {
      forecast_run_id: null,
      risk_level: null,
      status: 'open',
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      overstocked_count: 0,
      open_count: 0,
      acknowledged_count: 0,
      dismissed_count: 0,
      total_reorder_quantity: '0.000',
      top_reorder_items: [],
    },
    recent_activity: { activities: [], limit: 8 },
  };
}

function client(): ApiClient {
  return new ApiClient({
    baseUrl: TEST_API_BASE_URL,
    getAccessToken: () => 'test-access-token',
  });
}

describe('Dashboard FastAPI summary contract handlers', () => {
  it('uses the exact authenticated summary route, success envelope, and no UI-invented filters', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/dashboard/summary`, ({ request }) => {
        const url = new URL(request.url);
        expect(request.headers.get('authorization')).toBe('Bearer test-access-token');
        expect(url.search).toBe('');
        return HttpResponse.json({ success: true, data: dashboardSummaryWire() });
      }),
    );

    await expect(
      createHttpDashboardService(client()).getDashboardSummary(),
    ).resolves.toEqual({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-23',
      kpis: {
        totalProducts: 0,
        activeProducts: 0,
        totalSalesRecords: 0,
        totalInventoryItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalForecastRuns: 0,
        completedForecastRuns: 0,
        latestForecastMape: null,
        openRecommendations: 0,
        highRiskRecommendations: 0,
        criticalRiskRecommendations: 0,
        totalReorderQuantity: 0,
      },
      demandTrends: {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-23',
        interval: 'day',
        points: [],
      },
      inventoryRisk: {
        totalInventoryItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        healthyStockCount: 0,
        inactiveInventoryCount: 0,
        lowStockItems: [],
        outOfStockItems: [],
      },
      reorderAlerts: {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        overstockedCount: 0,
        openCount: 0,
        totalReorderQuantity: 0,
        topReorderItems: [],
      },
    });
  });

  it('preserves the shared safe failure envelope', async () => {
    server.use(
      http.get(`${TEST_API_BASE_URL}/api/v1/dashboard/summary`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'dashboard_aggregation_failed',
              message: 'Dashboard data is temporarily unavailable.',
            },
          },
          { status: 503 },
        ),
      ),
    );

    await expect(
      createHttpDashboardService(client()).getDashboardSummary(),
    ).rejects.toMatchObject({
      code: 'dashboard_aggregation_failed',
      message: 'Dashboard data is temporarily unavailable.',
    });
  });
});
