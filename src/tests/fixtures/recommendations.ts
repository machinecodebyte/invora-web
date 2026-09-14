import {
  RecommendationsServiceError,
  type RecommendationsService,
} from '@/features/recommendations/api';
import type {
  Recommendation,
  RecommendationPage,
  RecommendationQuery,
} from '@/features/recommendations/types';

function recommendation(
  index: number,
  overrides: Partial<Recommendation> = {},
): Recommendation {
  const id = String(index).padStart(12, '0');
  return {
    id: `11111111-1111-4111-8111-${id}`,
    forecastRunId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    productId: `22222222-2222-4222-8222-${id}`,
    productName: `Test Product ${index}`,
    sku: `TEST-${String(index).padStart(3, '0')}`,
    categoryId: null,
    categoryName: null,
    unit: 'pcs',
    predictedDemand: 10,
    currentStock: 5,
    minimumStock: 3,
    safetyStock: 4,
    requiredStock: 14,
    reorderQuantity: 9,
    stockGap: 9,
    riskLevel: 'low',
    recommendedAction: 'monitor',
    reason: null,
    status: 'open',
    generatedAt: `2026-07-${String((index % 27) + 1).padStart(2, '0')}T12:00:00Z`,
    acknowledgedAt: null,
    dismissedAt: null,
    createdAt: '2026-07-01T12:00:00Z',
    updatedAt: '2026-07-01T12:00:00Z',
    forecastRun: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      horizonDays: 15,
      status: 'completed',
      requestedAt: '2026-06-30T12:00:00Z',
      completedAt: '2026-07-01T12:00:00Z',
    },
    ...overrides,
  };
}

export const RECOMMENDATIONS_FIXTURE: RecommendationPage = {
  recommendations: [
    recommendation(1, {
      productName: 'Critical Widget',
      sku: 'CRIT-001',
      predictedDemand: 30,
      currentStock: 0,
      requiredStock: 34,
      reorderQuantity: 34,
      stockGap: 34,
      riskLevel: 'critical',
      recommendedAction: 'reorder_now',
      reason: 'Current stock is below required stock for the forecast horizon.',
      generatedAt: '2026-07-05T12:00:00Z',
    }),
    recommendation(2, {
      productName: 'High Risk Cable',
      sku: 'HIGH-002',
      predictedDemand: 16.5,
      currentStock: 2.5,
      requiredStock: 20.5,
      reorderQuantity: 18,
      stockGap: 18,
      riskLevel: 'high',
      recommendedAction: 'reorder_now',
      status: 'acknowledged',
      reason: 'Demand forecast exceeds the available stock coverage.',
      generatedAt: '2026-07-04T12:00:00Z',
    }),
    recommendation(3, {
      productName: 'Medium Powder',
      sku: 'MED-003',
      unit: 'kg',
      predictedDemand: 8.25,
      currentStock: 4.5,
      requiredStock: 7.25,
      reorderQuantity: 2.75,
      stockGap: 2.75,
      riskLevel: 'medium',
      recommendedAction: 'monitor',
      status: 'dismissed',
      reason: null,
      generatedAt: '2026-07-03T12:00:00Z',
    }),
    recommendation(4, {
      productName: 'Low Risk Labels',
      sku: 'LOW-004',
      riskLevel: 'low',
      generatedAt: '2026-07-02T12:00:00Z',
    }),
    recommendation(5, {
      productName: 'Overstocked Box',
      sku: 'OVER-005',
      predictedDemand: 0,
      currentStock: 40,
      requiredStock: 4,
      reorderQuantity: 0,
      stockGap: 0,
      riskLevel: 'overstocked',
      recommendedAction: 'overstock_review',
      reason: 'Current stock is above the required stock level.',
      generatedAt: '2026-07-01T12:00:00Z',
    }),
  ],
  total: 5,
  limit: 20,
  offset: 0,
};

export const EMPTY_RECOMMENDATIONS_FIXTURE: RecommendationPage = {
  recommendations: [],
  total: 0,
  limit: 20,
  offset: 0,
};

export const PAGINATED_RECOMMENDATIONS_FIXTURE: RecommendationPage = {
  recommendations: Array.from({ length: 21 }, (_, index) =>
    recommendation(index + 10, {
      productName: `Pagination Product ${String(index + 1).padStart(2, '0')}`,
      sku: `PAGE-${String(index + 1).padStart(3, '0')}`,
      generatedAt: `2026-08-${String((index % 27) + 1).padStart(2, '0')}T12:00:00Z`,
    }),
  ),
  total: 21,
  limit: 20,
  offset: 0,
};

function applyQuery(data: RecommendationPage, query: RecommendationQuery): RecommendationPage {
  const search = query.search?.trim().toLocaleLowerCase('en-US') ?? '';
  const rows = data.recommendations
    .filter(
      (item) =>
        (search === '' ||
          item.productName.toLocaleLowerCase('en-US').includes(search) ||
          item.sku.toLocaleLowerCase('en-US').includes(search) ||
          item.riskLevel.includes(search) ||
          item.recommendedAction.includes(search)) &&
        (query.riskLevel === null || item.riskLevel === query.riskLevel) &&
        (query.status === null || item.status === query.status),
    )
    .sort((left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime());
  return {
    recommendations: rows.slice(query.offset, query.offset + query.limit),
    total: rows.length,
    limit: query.limit,
    offset: query.offset,
  };
}

export interface RecommendationsTestServiceOptions {
  readonly data?: RecommendationPage | undefined;
  readonly error?: Error | undefined;
}

/** Deterministic Recommendations adapter used only in unit/component tests. */
export function createRecommendationsTestService(
  options: RecommendationsTestServiceOptions = {},
): RecommendationsService {
  const data = options.data ?? RECOMMENDATIONS_FIXTURE;
  return {
    listRecommendations: (query) => {
      if (options.error !== undefined) {
        return Promise.reject(options.error);
      }
      return Promise.resolve(applyQuery(data, query));
    },
  };
}

export function unavailableRecommendationsError(): RecommendationsServiceError {
  return new RecommendationsServiceError(
    'recommendations_unavailable',
    'Unable to load recommendations.',
  );
}
