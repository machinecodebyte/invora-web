import { describe, expect, it, vi } from 'vitest';

import {
  createHttpRecommendationsService,
  mapRecommendationGenerationResponse,
  mapRecommendationPageResponse,
  mapRecommendationSummaryResponse,
} from '@/features/recommendations/api';
import { ApiClient, type FetchLike } from '@/lib/api-client';

const RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECOMMENDATION_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';

const recommendation = {
  id: RECOMMENDATION_ID,
  forecast_run_id: RUN_ID,
  product_id: PRODUCT_ID,
  product_name: 'Blue Widget',
  sku: 'BLUE-001',
  category_id: null,
  category_name: null,
  unit: 'pcs',
  predicted_demand: '12.500',
  current_stock: '3.000',
  minimum_stock: '2.000',
  safety_stock: '4.000',
  required_stock: '16.500',
  reorder_quantity: '13.500',
  stock_gap: '13.500',
  risk_level: 'critical',
  recommended_action: 'reorder_now',
  reason: 'Persisted backend reason.',
  status: 'open',
  generated_at: '2026-09-24T08:00:00Z',
  acknowledged_at: null,
  dismissed_at: null,
  created_at: '2026-09-24T08:00:00Z',
  updated_at: '2026-09-24T08:00:00Z',
  forecast_run: {
    id: RUN_ID,
    horizon_days: 15,
    status: 'completed',
    requested_at: '2026-09-24T07:00:00Z',
    completed_at: '2026-09-24T08:00:00Z',
  },
} as const;

const page = {
  recommendations: [recommendation],
  total: 1,
  limit: 20,
  offset: 0,
} as const;
const summary = {
  forecast_run_id: RUN_ID,
  total_recommendations: 1,
  total_reorder_quantity: '13.500',
  critical_count: 1,
  high_count: 0,
  medium_count: 0,
  low_count: 0,
  overstocked_count: 0,
  total_predicted_demand: '12.500',
  total_current_stock: '3.000',
  latest_generated_at: '2026-09-24T08:00:00Z',
  top_reorder_products: [recommendation],
} as const;

const generation = {
  forecast_run_id: RUN_ID,
  total_products: 1,
  recommendations_created: 1,
  refreshed: false,
  critical_count: 1,
  high_count: 0,
  medium_count: 0,
  low_count: 0,
  overstocked_count: 0,
} as const;

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Recommendations wire mapping', () => {
  it('maps Decimal-compatible backend recommendations and aggregates at the API boundary', () => {
    expect(mapRecommendationPageResponse(page)).toMatchObject({
      total: 1,
      recommendations: [{ reorderQuantity: 13.5, forecastRun: { horizonDays: 15 } }],
    });
    expect(mapRecommendationSummaryResponse(summary)).toMatchObject({
      totalReorderQuantity: 13.5,
      totalPredictedDemand: 12.5,
      topReorderProducts: [{ productId: PRODUCT_ID }],
    });
    expect(mapRecommendationGenerationResponse(generation)).toEqual({
      forecastRunId: RUN_ID,
      totalProducts: 1,
      recommendationsCreated: 1,
      refreshed: false,
      criticalCount: 1,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      overstockedCount: 0,
    });
  });

  it('rejects malformed recommendations without manufacturing decisions', () => {
    expect(() => mapRecommendationPageResponse({ ...page, total: '1' })).toThrow(
      'Unable to load recommendations.',
    );
    expect(() =>
      mapRecommendationSummaryResponse({ ...summary, total_current_stock: 'NaN' }),
    ).toThrow('Unable to load recommendations.');
  });
});

describe('Recommendations HTTP service', () => {
  it('uses all six exact authenticated endpoints and the explicit refresh=false generation body', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input, init) => {
      const url = new URL(String(input));
      expect(new Headers(init.headers).get('Authorization')).toBe(
        'Bearer access-token',
      );
      if (url.pathname.endsWith(`/recommendations/runs/${RUN_ID}/generate`)) {
        expect(JSON.parse(String(init.body))).toEqual({ refresh: false });
        return response(generation);
      }
      if (url.pathname.endsWith('/recommendations')) {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          search: 'BLUE',
          risk_level: 'critical',
          status: 'open',
          limit: '20',
          offset: '0',
          sort_by: 'generated_at',
          sort_order: 'desc',
        });
        return response(page);
      }
      if (url.pathname.endsWith(`/recommendations/runs/${RUN_ID}`)) {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          risk_level: 'critical',
          status: 'open',
          limit: '20',
          offset: '0',
          sort_by: 'risk_level',
          sort_order: 'desc',
        });
        return response({ ...page, forecast_run_id: RUN_ID });
      }
      if (url.pathname.endsWith(`/recommendations/runs/${RUN_ID}/summary`)) {
        return response(summary);
      }
      if (url.pathname.endsWith(`/recommendations/${RECOMMENDATION_ID}/status`)) {
        expect(JSON.parse(String(init.body))).toEqual({ status: 'acknowledged' });
        return response({
          recommendation: { ...recommendation, status: 'acknowledged' },
        });
      }
      if (url.pathname.endsWith(`/recommendations/${RECOMMENDATION_ID}`)) {
        return response({ recommendation });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const service = createHttpRecommendationsService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        fetchImpl,
        getAccessToken: () => 'access-token',
      }),
    );

    const listQuery = {
      search: ' BLUE ',
      riskLevel: 'critical' as const,
      status: 'open' as const,
      limit: 20,
      offset: 0,
      sortBy: 'generated_at' as const,
      sortOrder: 'desc' as const,
    };
    const runQuery = {
      riskLevel: 'critical' as const,
      status: 'open' as const,
      limit: 20,
      offset: 0,
      sortBy: 'risk_level' as const,
      sortOrder: 'desc' as const,
    };

    await expect(
      service.generateRecommendations(RUN_ID, { refresh: false }),
    ).resolves.toMatchObject({
      recommendationsCreated: 1,
    });
    await expect(service.listRecommendations(listQuery)).resolves.toMatchObject({
      total: 1,
    });
    await expect(
      service.listRunRecommendations(RUN_ID, runQuery),
    ).resolves.toMatchObject({ total: 1 });
    await expect(service.getRunSummary(RUN_ID)).resolves.toMatchObject({
      totalRecommendations: 1,
    });
    await expect(service.getRecommendation(RECOMMENDATION_ID)).resolves.toMatchObject({
      sku: 'BLUE-001',
    });
    await expect(
      service.updateRecommendationStatus(RECOMMENDATION_ID, 'acknowledged'),
    ).resolves.toMatchObject({ status: 'acknowledged' });
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });
});
