import {
  RECOMMENDATION_ACTIONS,
  RECOMMENDATION_RISK_LEVELS,
  RECOMMENDATION_STATUSES,
  type Recommendation,
  type RecommendationAction,
  type RecommendationForecastRun,
  type RecommendationGenerationResult,
  type RecommendationPage,
  type RecommendationQuery,
  type RecommendationRiskLevel,
  type RecommendationRunQuery,
  type RecommendationStatus,
  type RecommendationStatusUpdate,
  type RecommendationSummary,
} from '@/features/recommendations/types';
import { isApiError } from '@/lib/api-error';
import { apiClient, type ApiClient } from '@/lib/api-client';

export type RecommendationsServiceErrorCode =
  | 'recommendations_unavailable'
  | 'recommendations_not_generated'
  | 'recommendations_already_generated'
  | 'recommendation_not_found'
  | 'invalid_recommendation_status_transition';

/** Safe error permitted across the Recommendations service/UI boundary. */
export class RecommendationsServiceError extends Error {
  constructor(
    public readonly code: RecommendationsServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RecommendationsServiceError';
  }
}

/** Caller-owned cancellation for read requests. */
export interface RecommendationsRequestOptions {
  readonly signal?: AbortSignal | undefined;
}

/** Transport boundary for all verified user-facing Recommendations operations. */
export interface RecommendationsService {
  generateRecommendations(
    forecastRunId: string,
    input: { readonly refresh: boolean },
  ): Promise<RecommendationGenerationResult>;
  listRecommendations(
    query: RecommendationQuery,
    options?: RecommendationsRequestOptions,
  ): Promise<RecommendationPage>;
  listRunRecommendations(
    forecastRunId: string,
    query: RecommendationRunQuery,
    options?: RecommendationsRequestOptions,
  ): Promise<RecommendationPage>;
  getRunSummary(
    forecastRunId: string,
    options?: RecommendationsRequestOptions,
  ): Promise<RecommendationSummary>;
  getRecommendation(
    recommendationId: string,
    options?: RecommendationsRequestOptions,
  ): Promise<Recommendation>;
  updateRecommendationStatus(
    recommendationId: string,
    status: RecommendationStatusUpdate,
  ): Promise<Recommendation>;
}

type DecimalWire = number | string;

type RecommendationForecastRunWire = {
  readonly id: string;
  readonly horizon_days: 7 | 15 | 30;
  readonly status: string;
  readonly requested_at: string;
  readonly completed_at: string | null;
};

type RecommendationWire = {
  readonly id: string;
  readonly forecast_run_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly unit: string;
  readonly predicted_demand: DecimalWire;
  readonly current_stock: DecimalWire;
  readonly minimum_stock: DecimalWire;
  readonly safety_stock: DecimalWire;
  readonly required_stock: DecimalWire;
  readonly reorder_quantity: DecimalWire;
  readonly stock_gap: DecimalWire;
  readonly risk_level: RecommendationRiskLevel;
  readonly recommended_action: RecommendationAction;
  readonly reason: string | null;
  readonly status: RecommendationStatus;
  readonly generated_at: string;
  readonly acknowledged_at: string | null;
  readonly dismissed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly forecast_run: RecommendationForecastRunWire;
};

type RecommendationPageWire = {
  readonly recommendations: readonly RecommendationWire[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

type RecommendationGenerationWire = {
  readonly forecast_run_id: string;
  readonly total_products: number;
  readonly recommendations_created: number;
  readonly refreshed: boolean;
  readonly critical_count: number;
  readonly high_count: number;
  readonly medium_count: number;
  readonly low_count: number;
  readonly overstocked_count: number;
};

type RecommendationSummaryWire = {
  readonly forecast_run_id: string;
  readonly total_recommendations: number;
  readonly total_reorder_quantity: DecimalWire;
  readonly critical_count: number;
  readonly high_count: number;
  readonly medium_count: number;
  readonly low_count: number;
  readonly overstocked_count: number;
  readonly total_predicted_demand: DecimalWire;
  readonly total_current_stock: DecimalWire;
  readonly latest_generated_at: string;
  readonly top_reorder_products: readonly RecommendationWire[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDecimalWire(value: unknown): value is DecimalWire {
  return (
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
  );
}

function isRiskLevel(value: unknown): value is RecommendationRiskLevel {
  return (
    typeof value === 'string' &&
    RECOMMENDATION_RISK_LEVELS.includes(value as RecommendationRiskLevel)
  );
}

function isAction(value: unknown): value is RecommendationAction {
  return (
    typeof value === 'string' &&
    RECOMMENDATION_ACTIONS.includes(value as RecommendationAction)
  );
}

function isStatus(value: unknown): value is RecommendationStatus {
  return (
    typeof value === 'string' &&
    RECOMMENDATION_STATUSES.includes(value as RecommendationStatus)
  );
}

function isForecastRunWire(value: unknown): value is RecommendationForecastRunWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.horizon_days === 7 ||
      value.horizon_days === 15 ||
      value.horizon_days === 30) &&
    typeof value.status === 'string' &&
    typeof value.requested_at === 'string' &&
    isStringOrNull(value.completed_at)
  );
}

function isRecommendationWire(value: unknown): value is RecommendationWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.forecast_run_id === 'string' &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isStringOrNull(value.category_id) &&
    isStringOrNull(value.category_name) &&
    typeof value.unit === 'string' &&
    isDecimalWire(value.predicted_demand) &&
    isDecimalWire(value.current_stock) &&
    isDecimalWire(value.minimum_stock) &&
    isDecimalWire(value.safety_stock) &&
    isDecimalWire(value.required_stock) &&
    isDecimalWire(value.reorder_quantity) &&
    isDecimalWire(value.stock_gap) &&
    isRiskLevel(value.risk_level) &&
    isAction(value.recommended_action) &&
    isStringOrNull(value.reason) &&
    isStatus(value.status) &&
    typeof value.generated_at === 'string' &&
    isStringOrNull(value.acknowledged_at) &&
    isStringOrNull(value.dismissed_at) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string' &&
    isForecastRunWire(value.forecast_run)
  );
}

function isRecommendationPageWire(value: unknown): value is RecommendationPageWire {
  return (
    isRecord(value) &&
    Array.isArray(value.recommendations) &&
    value.recommendations.every(isRecommendationWire) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.limit) &&
    isFiniteNumber(value.offset)
  );
}

function toDecimal(value: DecimalWire): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw invalidRecommendationsResponse();
  }
  return parsed;
}

function mapForecastRun(
  value: RecommendationForecastRunWire,
): RecommendationForecastRun {
  return {
    id: value.id,
    horizonDays: value.horizon_days,
    status: value.status,
    requestedAt: value.requested_at,
    completedAt: value.completed_at,
  };
}

/** Maps a safe backend-owned recommendation projection. */
export function mapRecommendationResponse(value: unknown): Recommendation {
  if (!isRecommendationWire(value)) {
    throw invalidRecommendationsResponse();
  }
  return {
    id: value.id,
    forecastRunId: value.forecast_run_id,
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryId: value.category_id,
    categoryName: value.category_name,
    unit: value.unit,
    predictedDemand: toDecimal(value.predicted_demand),
    currentStock: toDecimal(value.current_stock),
    minimumStock: toDecimal(value.minimum_stock),
    safetyStock: toDecimal(value.safety_stock),
    requiredStock: toDecimal(value.required_stock),
    reorderQuantity: toDecimal(value.reorder_quantity),
    stockGap: toDecimal(value.stock_gap),
    riskLevel: value.risk_level,
    recommendedAction: value.recommended_action,
    reason: value.reason,
    status: value.status,
    generatedAt: value.generated_at,
    acknowledgedAt: value.acknowledged_at,
    dismissedAt: value.dismissed_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    forecastRun: mapForecastRun(value.forecast_run),
  };
}

/** Maps server-pagination metadata without deriving totals locally. */
export function mapRecommendationPageResponse(value: unknown): RecommendationPage {
  if (!isRecommendationPageWire(value)) {
    throw invalidRecommendationsResponse();
  }
  return {
    recommendations: value.recommendations.map(mapRecommendationResponse),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

export function mapRecommendationDetailResponse(value: unknown): Recommendation {
  if (!isRecord(value) || !isRecommendationWire(value.recommendation)) {
    throw invalidRecommendationsResponse();
  }
  return mapRecommendationResponse(value.recommendation);
}

export function mapRecommendationGenerationResponse(
  value: unknown,
): RecommendationGenerationResult {
  if (
    !isRecord(value) ||
    typeof value.forecast_run_id !== 'string' ||
    !isFiniteNumber(value.total_products) ||
    !isFiniteNumber(value.recommendations_created) ||
    typeof value.refreshed !== 'boolean' ||
    !isFiniteNumber(value.critical_count) ||
    !isFiniteNumber(value.high_count) ||
    !isFiniteNumber(value.medium_count) ||
    !isFiniteNumber(value.low_count) ||
    !isFiniteNumber(value.overstocked_count)
  ) {
    throw invalidRecommendationsResponse();
  }
  const data = value as RecommendationGenerationWire;
  return {
    forecastRunId: data.forecast_run_id,
    totalProducts: data.total_products,
    recommendationsCreated: data.recommendations_created,
    refreshed: data.refreshed,
    criticalCount: data.critical_count,
    highCount: data.high_count,
    mediumCount: data.medium_count,
    lowCount: data.low_count,
    overstockedCount: data.overstocked_count,
  };
}

export function mapRecommendationSummaryResponse(
  value: unknown,
): RecommendationSummary {
  if (
    !isRecord(value) ||
    typeof value.forecast_run_id !== 'string' ||
    !isFiniteNumber(value.total_recommendations) ||
    !isDecimalWire(value.total_reorder_quantity) ||
    !isFiniteNumber(value.critical_count) ||
    !isFiniteNumber(value.high_count) ||
    !isFiniteNumber(value.medium_count) ||
    !isFiniteNumber(value.low_count) ||
    !isFiniteNumber(value.overstocked_count) ||
    !isDecimalWire(value.total_predicted_demand) ||
    !isDecimalWire(value.total_current_stock) ||
    typeof value.latest_generated_at !== 'string' ||
    !Array.isArray(value.top_reorder_products) ||
    !value.top_reorder_products.every(isRecommendationWire)
  ) {
    throw invalidRecommendationsResponse();
  }
  const data = value as RecommendationSummaryWire;
  return {
    forecastRunId: data.forecast_run_id,
    totalRecommendations: data.total_recommendations,
    totalReorderQuantity: toDecimal(data.total_reorder_quantity),
    criticalCount: data.critical_count,
    highCount: data.high_count,
    mediumCount: data.medium_count,
    lowCount: data.low_count,
    overstockedCount: data.overstocked_count,
    totalPredictedDemand: toDecimal(data.total_predicted_demand),
    totalCurrentStock: toDecimal(data.total_current_stock),
    latestGeneratedAt: data.latest_generated_at,
    topReorderProducts: data.top_reorder_products.map(mapRecommendationResponse),
  };
}

function invalidRecommendationsResponse(): RecommendationsServiceError {
  return new RecommendationsServiceError(
    'recommendations_unavailable',
    'Unable to load recommendations.',
  );
}

function toRecommendationsServiceError(
  error: unknown,
  fallback: string,
): RecommendationsServiceError {
  if (error instanceof RecommendationsServiceError) {
    return error;
  }
  if (isApiError(error)) {
    switch (error.code) {
      case 'recommendations_not_generated':
        return new RecommendationsServiceError(
          'recommendations_not_generated',
          'Recommendations have not been generated for this forecast run.',
        );
      case 'recommendations_already_generated':
        return new RecommendationsServiceError(
          'recommendations_already_generated',
          'Recommendations already exist for this forecast run. Existing recommendations were loaded.',
        );
      case 'recommendation_not_found':
        return new RecommendationsServiceError(
          'recommendation_not_found',
          'Recommendation details are no longer available.',
        );
      case 'invalid_recommendation_status_transition':
        return new RecommendationsServiceError(
          'invalid_recommendation_status_transition',
          'This recommendation status can no longer be changed.',
        );
      default:
        return new RecommendationsServiceError(
          'recommendations_unavailable',
          error.message,
        );
    }
  }
  return new RecommendationsServiceError('recommendations_unavailable', fallback);
}

function toListQueryParams(
  query: RecommendationQuery,
): Record<string, string | number | null> {
  const search = query.search?.trim();
  return {
    search: search === undefined || search === '' ? null : search,
    risk_level: query.riskLevel,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  };
}

function toRunListQueryParams(
  query: RecommendationRunQuery,
): Record<string, string | number | null> {
  return {
    risk_level: query.riskLevel,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  };
}

/** Real authenticated Recommendation adapter. Backend retains all business authority. */
export function createHttpRecommendationsService(
  client: ApiClient = apiClient,
): RecommendationsService {
  return {
    async generateRecommendations(forecastRunId, input) {
      try {
        const response = await client.post<unknown>(
          `/api/v1/recommendations/runs/${encodeURIComponent(forecastRunId)}/generate`,
          { refresh: input.refresh },
        );
        return mapRecommendationGenerationResponse(response);
      } catch (error: unknown) {
        throw toRecommendationsServiceError(
          error,
          'Unable to generate recommendations for this forecast run.',
        );
      }
    },
    async listRecommendations(query, options) {
      try {
        const response = await client.get<unknown>('/api/v1/recommendations', {
          query: toListQueryParams(query),
          ...(options?.signal === undefined ? {} : { signal: options.signal }),
        });
        return mapRecommendationPageResponse(response);
      } catch (error: unknown) {
        throw toRecommendationsServiceError(error, 'Unable to load recommendations.');
      }
    },
    async listRunRecommendations(forecastRunId, query, options) {
      try {
        const response = await client.get<unknown>(
          `/api/v1/recommendations/runs/${encodeURIComponent(forecastRunId)}`,
          {
            query: toRunListQueryParams(query),
            ...(options?.signal === undefined ? {} : { signal: options.signal }),
          },
        );
        return mapRecommendationPageResponse(response);
      } catch (error: unknown) {
        throw toRecommendationsServiceError(error, 'Unable to load recommendations.');
      }
    },
    async getRunSummary(forecastRunId, options) {
      try {
        const response = await client.get<unknown>(
          `/api/v1/recommendations/runs/${encodeURIComponent(forecastRunId)}/summary`,
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        return mapRecommendationSummaryResponse(response);
      } catch (error: unknown) {
        throw toRecommendationsServiceError(
          error,
          'Unable to load the recommendation summary.',
        );
      }
    },
    async getRecommendation(recommendationId, options) {
      try {
        const response = await client.get<unknown>(
          `/api/v1/recommendations/${encodeURIComponent(recommendationId)}`,
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        return mapRecommendationDetailResponse(response);
      } catch (error: unknown) {
        throw toRecommendationsServiceError(
          error,
          'Unable to load recommendation details.',
        );
      }
    },
    async updateRecommendationStatus(recommendationId, status) {
      try {
        const response = await client.patch<unknown>(
          `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/status`,
          { status },
        );
        return mapRecommendationDetailResponse(response);
      } catch (error: unknown) {
        throw toRecommendationsServiceError(
          error,
          'Unable to update this recommendation.',
        );
      }
    },
  };
}

/** Storage key consumed only by Playwright's deterministic Recommendations fixture. */
export const RECOMMENDATIONS_E2E_STORAGE_KEY = 'invora-e2e-recommendations-fixture';

export type RecommendationsE2EFixture =
  | { readonly state: 'ready'; readonly data: RecommendationPage }
  | { readonly state: 'empty' }
  | { readonly state: 'not_generated'; readonly data: RecommendationPage }
  | { readonly state: 'error' };

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
    isRiskLevel(value.riskLevel) &&
    isAction(value.recommendedAction) &&
    isStringOrNull(value.reason) &&
    isStatus(value.status) &&
    typeof value.generatedAt === 'string' &&
    isStringOrNull(value.acknowledgedAt) &&
    isStringOrNull(value.dismissedAt) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isForecastRun(value.forecastRun)
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
    if (value.state === 'empty' || value.state === 'error') {
      return { state: value.state };
    }
    if (
      (value.state === 'ready' || value.state === 'not_generated') &&
      isRecommendationPage(value.data)
    ) {
      return { state: value.state, data: value.data };
    }
  } catch {
    // Malformed test storage never becomes visible recommendation data.
  }
  return { state: 'empty' };
}

function writeE2EFixture(fixture: RecommendationsE2EFixture): void {
  window.sessionStorage.setItem(
    RECOMMENDATIONS_E2E_STORAGE_KEY,
    JSON.stringify(fixture),
  );
}

function applyQuery(
  data: RecommendationPage,
  query: RecommendationQuery,
): RecommendationPage {
  const search = query.search?.trim().toLocaleLowerCase('en-US') ?? '';
  const filtered = data.recommendations.filter(
    (recommendation) =>
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

function applyRunQuery(
  data: RecommendationPage,
  query: RecommendationRunQuery,
): RecommendationPage {
  const filtered = data.recommendations.filter(
    (recommendation) =>
      (query.riskLevel === null || recommendation.riskLevel === query.riskLevel) &&
      (query.status === null || recommendation.status === query.status),
  );
  return {
    recommendations: filtered.slice(query.offset, query.offset + query.limit),
    total: filtered.length,
    limit: query.limit,
    offset: query.offset,
  };
}

function fixtureSummary(data: RecommendationPage): RecommendationSummary {
  const count = (riskLevel: RecommendationRiskLevel): number =>
    data.recommendations.filter((item) => item.riskLevel === riskLevel).length;
  return {
    forecastRunId: data.recommendations[0]?.forecastRunId ?? '',
    totalRecommendations: data.total,
    totalReorderQuantity: data.recommendations.reduce(
      (total, item) => total + item.reorderQuantity,
      0,
    ),
    criticalCount: count('critical'),
    highCount: count('high'),
    mediumCount: count('medium'),
    lowCount: count('low'),
    overstockedCount: count('overstocked'),
    totalPredictedDemand: data.recommendations.reduce(
      (total, item) => total + item.predictedDemand,
      0,
    ),
    totalCurrentStock: data.recommendations.reduce(
      (total, item) => total + item.currentStock,
      0,
    ),
    latestGeneratedAt: data.recommendations[0]?.generatedAt ?? '',
    topReorderProducts: [...data.recommendations].sort(
      (left, right) => right.reorderQuantity - left.reorderQuantity,
    ),
  };
}

function e2EError(
  code: RecommendationsServiceErrorCode,
  message: string,
): RecommendationsServiceError {
  return new RecommendationsServiceError(code, message);
}

/** Session-scoped deterministic adapter selected only in the Playwright-managed build. */
export function createE2ERecommendationsService(): RecommendationsService {
  return {
    listRecommendations(query) {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          e2EError('recommendations_unavailable', 'Unable to load recommendations.'),
        );
      }
      if (fixture.state === 'empty' || fixture.state === 'not_generated') {
        return Promise.resolve({
          recommendations: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
        });
      }
      return Promise.resolve(applyQuery(fixture.data, query));
    },
    listRunRecommendations(forecastRunId, query) {
      const fixture = readE2EFixture();
      if (fixture.state === 'not_generated') {
        return Promise.reject(
          e2EError(
            'recommendations_not_generated',
            'Recommendations have not been generated for this forecast run.',
          ),
        );
      }
      if (
        fixture.state !== 'ready' ||
        fixture.data.recommendations[0]?.forecastRunId !== forecastRunId
      ) {
        return Promise.resolve({
          recommendations: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
        });
      }
      return Promise.resolve(applyRunQuery(fixture.data, query));
    },
    getRunSummary(forecastRunId) {
      const fixture = readE2EFixture();
      if (fixture.state === 'not_generated') {
        return Promise.reject(
          e2EError(
            'recommendations_not_generated',
            'Recommendations have not been generated for this forecast run.',
          ),
        );
      }
      if (
        fixture.state !== 'ready' ||
        fixture.data.recommendations[0]?.forecastRunId !== forecastRunId
      ) {
        return Promise.reject(
          e2EError(
            'recommendations_unavailable',
            'Unable to load the recommendation summary.',
          ),
        );
      }
      return Promise.resolve(fixtureSummary(fixture.data));
    },
    getRecommendation(recommendationId) {
      const fixture = readE2EFixture();
      const recommendation =
        fixture.state === 'ready'
          ? fixture.data.recommendations.find((item) => item.id === recommendationId)
          : undefined;
      return recommendation === undefined
        ? Promise.reject(
            e2EError(
              'recommendation_not_found',
              'Recommendation details are no longer available.',
            ),
          )
        : Promise.resolve(recommendation);
    },
    updateRecommendationStatus(recommendationId, status) {
      const fixture = readE2EFixture();
      if (fixture.state !== 'ready') {
        return Promise.reject(
          e2EError(
            'recommendation_not_found',
            'Recommendation details are no longer available.',
          ),
        );
      }
      const current = fixture.data.recommendations.find(
        (item) => item.id === recommendationId,
      );
      if (
        current === undefined ||
        current.status === 'dismissed' ||
        (current.status === 'acknowledged' && status !== 'dismissed') ||
        (current.status === 'open' &&
          status !== 'acknowledged' &&
          status !== 'dismissed')
      ) {
        return Promise.reject(
          e2EError(
            'invalid_recommendation_status_transition',
            'This recommendation status can no longer be changed.',
          ),
        );
      }
      const updated: Recommendation = {
        ...current,
        status,
        acknowledgedAt:
          status === 'acknowledged'
            ? (current.acknowledgedAt ?? current.updatedAt)
            : current.acknowledgedAt,
        dismissedAt:
          status === 'dismissed'
            ? (current.dismissedAt ?? current.updatedAt)
            : current.dismissedAt,
      };
      writeE2EFixture({
        state: 'ready',
        data: {
          ...fixture.data,
          recommendations: fixture.data.recommendations.map((item) =>
            item.id === recommendationId ? updated : item,
          ),
        },
      });
      return Promise.resolve(updated);
    },
    generateRecommendations(forecastRunId, input) {
      const fixture = readE2EFixture();
      if (fixture.state === 'ready') {
        return Promise.reject(
          e2EError(
            'recommendations_already_generated',
            'Recommendations already exist for this forecast run. Existing recommendations were loaded.',
          ),
        );
      }
      if (
        fixture.state !== 'not_generated' ||
        input.refresh ||
        fixture.data.recommendations[0]?.forecastRunId !== forecastRunId
      ) {
        return Promise.reject(
          e2EError(
            'recommendations_unavailable',
            'Unable to generate recommendations for this forecast run.',
          ),
        );
      }
      writeE2EFixture({ state: 'ready', data: fixture.data });
      const summary = fixtureSummary(fixture.data);
      return Promise.resolve({
        forecastRunId,
        totalProducts: summary.totalRecommendations,
        recommendationsCreated: summary.totalRecommendations,
        refreshed: false,
        criticalCount: summary.criticalCount,
        highCount: summary.highCount,
        mediumCount: summary.mediumCount,
        lowCount: summary.lowCount,
        overstockedCount: summary.overstockedCount,
      });
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_RECOMMENDATIONS_E2E_TEST_MODE === 'true';

/** The single Recommendations service selected for the current frontend build. */
export const recommendationsService: RecommendationsService = isE2ETestMode
  ? createE2ERecommendationsService()
  : createHttpRecommendationsService();
