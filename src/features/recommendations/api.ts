import {
  RECOMMENDATION_ACTIONS,
  RECOMMENDATION_RISK_LEVELS,
  RECOMMENDATION_STATUSES,
  type Recommendation,
  type RecommendationAction,
  type RecommendationForecastRun,
  type RecommendationPage,
  type RecommendationQuery,
  type RecommendationRiskLevel,
  type RecommendationStatus,
} from '@/features/recommendations/types';

export type RecommendationsServiceErrorCode = 'recommendations_unavailable';

/** Safe error that can cross the Recommendations service/UI boundary. */
export class RecommendationsServiceError extends Error {
  constructor(
    public readonly code: RecommendationsServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RecommendationsServiceError';
  }
}

/** Read-only service contract for the future Reorder Recommendation HTTP adapter. */
export interface RecommendationsService {
  listRecommendations(query: RecommendationQuery): Promise<RecommendationPage>;
}

/**
 * Honest normal-runtime boundary: it neither invokes business calculations nor
 * makes an HTTP request before the integration phase.
 */
export function createUnavailableRecommendationsService(): RecommendationsService {
  return {
    listRecommendations: () =>
      Promise.reject(
        new RecommendationsServiceError(
          'recommendations_unavailable',
          'Unable to load recommendations.',
        ),
      ),
  };
}

/** Storage key consumed only by Playwright's Recommendations fixture adapter. */
export const RECOMMENDATIONS_E2E_STORAGE_KEY = 'invora-e2e-recommendations-fixture';

export type RecommendationsE2EFixture =
  | { readonly state: 'ready'; readonly data: RecommendationPage }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRecommendationRiskLevel(value: unknown): value is RecommendationRiskLevel {
  return (
    typeof value === 'string' &&
    RECOMMENDATION_RISK_LEVELS.includes(value as RecommendationRiskLevel)
  );
}

function isRecommendationStatus(value: unknown): value is RecommendationStatus {
  return (
    typeof value === 'string' &&
    RECOMMENDATION_STATUSES.includes(value as RecommendationStatus)
  );
}

function isRecommendationAction(value: unknown): value is RecommendationAction {
  return (
    typeof value === 'string' &&
    RECOMMENDATION_ACTIONS.includes(value as RecommendationAction)
  );
}

function isForecastRun(value: unknown): value is RecommendationForecastRun {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.horizonDays === 7 || value.horizonDays === 15 || value.horizonDays === 30) &&
    typeof value.status === 'string' &&
    typeof value.requestedAt === 'string' &&
    isStringOrNull(value.completedAt)
  );
}

function isRecommendation(value: unknown): value is Recommendation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.forecastRunId === 'string' &&
    typeof value.productId === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.sku === 'string' &&
    isStringOrNull(value.categoryId) &&
    isStringOrNull(value.categoryName) &&
    typeof value.unit === 'string' &&
    isFiniteNumber(value.predictedDemand) &&
    isFiniteNumber(value.currentStock) &&
    isFiniteNumber(value.minimumStock) &&
    isFiniteNumber(value.safetyStock) &&
    isFiniteNumber(value.requiredStock) &&
    isFiniteNumber(value.reorderQuantity) &&
    isFiniteNumber(value.stockGap) &&
    isRecommendationRiskLevel(value.riskLevel) &&
    isRecommendationAction(value.recommendedAction) &&
    isStringOrNull(value.reason) &&
    isRecommendationStatus(value.status) &&
    typeof value.generatedAt === 'string' &&
    isStringOrNull(value.acknowledgedAt) &&
    isStringOrNull(value.dismissedAt) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isForecastRun(value.forecastRun)
  );
}

function isRecommendationPage(value: unknown): value is RecommendationPage {
  return (
    isRecord(value) &&
    Array.isArray(value.recommendations) &&
    value.recommendations.every(isRecommendation) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.limit) &&
    isFiniteNumber(value.offset)
  );
}

function readE2EFixture(): RecommendationsE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'empty' };
  }
  const encodedFixture = window.sessionStorage.getItem(RECOMMENDATIONS_E2E_STORAGE_KEY);
  if (encodedFixture === null) {
    return { state: 'empty' };
  }
  try {
    const value: unknown = JSON.parse(encodedFixture);
    if (!isRecord(value)) {
      return { state: 'empty' };
    }
    if (value.state === 'empty') {
      return { state: 'empty' };
    }
    if (value.state === 'error') {
      return { state: 'error' };
    }
    if (value.state === 'ready' && isRecommendationPage(value.data)) {
      return { state: 'ready', data: value.data };
    }
  } catch {
    // A malformed test fixture must never become visible Recommendation data.
  }
  return { state: 'empty' };
}

function applyQuery(data: RecommendationPage, query: RecommendationQuery): RecommendationPage {
  const search = query.search?.trim().toLocaleLowerCase('en-US') ?? '';
  const filtered = data.recommendations.filter((recommendation) =>
    (search === '' ||
      recommendation.productName.toLocaleLowerCase('en-US').includes(search) ||
      recommendation.sku.toLocaleLowerCase('en-US').includes(search) ||
      recommendation.riskLevel.includes(search) ||
      recommendation.recommendedAction.includes(search)) &&
    (query.riskLevel === null || recommendation.riskLevel === query.riskLevel) &&
    (query.status === null || recommendation.status === query.status),
  );
  const ordered = [...filtered].sort(
    (left, right) =>
      new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
  );

  return {
    recommendations: ordered.slice(query.offset, query.offset + query.limit),
    total: ordered.length,
    limit: query.limit,
    offset: query.offset,
  };
}

/** Session-scoped deterministic adapter used only in the Playwright-managed build. */
export function createE2ERecommendationsService(): RecommendationsService {
  return {
    listRecommendations: (query) => {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new RecommendationsServiceError(
            'recommendations_unavailable',
            'Unable to load recommendations.',
          ),
        );
      }
      if (fixture.state === 'empty') {
        return Promise.resolve({
          recommendations: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
        });
      }
      return Promise.resolve(applyQuery(fixture.data, query));
    },
  };
}

const isE2ETestMode =
  process.env.NEXT_PUBLIC_RECOMMENDATIONS_E2E_TEST_MODE === 'true';

/** The only Recommendations adapter selected by the current frontend build. */
export const recommendationsService: RecommendationsService = isE2ETestMode
  ? createE2ERecommendationsService()
  : createUnavailableRecommendationsService();
