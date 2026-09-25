/** Exact risk values returned by the Reorder Recommendation backend contract. */
export const RECOMMENDATION_RISK_LEVELS = [
  'low',
  'medium',
  'high',
  'critical',
  'overstocked',
] as const;

export const RECOMMENDATION_STATUSES = ['open', 'acknowledged', 'dismissed'] as const;

export const RECOMMENDATION_ACTIONS = [
  'reorder_now',
  'monitor',
  'no_reorder_needed',
  'overstock_review',
] as const;

export type RecommendationRiskLevel = (typeof RECOMMENDATION_RISK_LEVELS)[number];
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];
export type RecommendationAction = (typeof RECOMMENDATION_ACTIONS)[number];
export type RecommendationRiskFilter = 'all' | RecommendationRiskLevel;
export type RecommendationStatusFilter = 'all' | RecommendationStatus;
export type RecommendationStatusUpdate = Exclude<RecommendationStatus, 'open'>;

/** Minimal safe Forecast Run reference embedded by the Recommendation contract. */
export interface RecommendationForecastRun {
  readonly id: string;
  readonly horizonDays: 7 | 15 | 30;
  readonly status: string;
  readonly requestedAt: string;
  readonly completedAt: string | null;
}

/** Read-only recommendation projection normalized for the future HTTP adapter. */
export interface Recommendation {
  readonly id: string;
  readonly forecastRunId: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly unit: string;
  /** Backend Numeric(14, 3) values become numbers only at the adapter boundary. */
  readonly predictedDemand: number;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly safetyStock: number;
  readonly requiredStock: number;
  readonly reorderQuantity: number;
  readonly stockGap: number;
  readonly riskLevel: RecommendationRiskLevel;
  readonly recommendedAction: RecommendationAction;
  readonly reason: string | null;
  readonly status: RecommendationStatus;
  readonly generatedAt: string;
  readonly acknowledgedAt: string | null;
  readonly dismissedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly forecastRun: RecommendationForecastRun;
}

/** Backend offset/limit projection for the main Recommendation listing. */
export interface RecommendationPage {
  readonly recommendations: readonly Recommendation[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/** Backend aggregate for one generated Forecast Run recommendation set. */
export interface RecommendationSummary {
  readonly forecastRunId: string;
  readonly totalRecommendations: number;
  readonly totalReorderQuantity: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly overstockedCount: number;
  readonly totalPredictedDemand: number;
  readonly totalCurrentStock: number;
  readonly latestGeneratedAt: string;
  readonly topReorderProducts: readonly Recommendation[];
}

/** Result of the explicit, conflict-sensitive recommendation generation request. */
export interface RecommendationGenerationResult {
  readonly forecastRunId: string;
  readonly totalProducts: number;
  readonly recommendationsCreated: number;
  readonly refreshed: boolean;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly overstockedCount: number;
}

/** Only the list filters implemented by Module 9's UI. */
export interface RecommendationFilters {
  readonly search: string;
  readonly riskLevel: RecommendationRiskFilter;
  readonly status: RecommendationStatusFilter;
}

/** Transport-neutral representation of the backend list query. */
export interface RecommendationQuery {
  readonly search: string | null;
  readonly riskLevel: RecommendationRiskLevel | null;
  readonly status: RecommendationStatus | null;
  readonly limit: number;
  readonly offset: number;
  readonly sortBy: 'generated_at';
  readonly sortOrder: 'desc';
}

/** Run-scoped endpoint deliberately exposes a narrower query surface. */
export interface RecommendationRunQuery {
  readonly riskLevel: RecommendationRiskLevel | null;
  readonly status: RecommendationStatus | null;
  readonly limit: number;
  readonly offset: number;
  readonly sortBy: 'risk_level';
  readonly sortOrder: 'desc';
}

export type RecommendationsViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: RecommendationPage }
  | { readonly status: 'not_generated' }
  | { readonly status: 'invalid_run' }
  | { readonly status: 'error'; readonly message: string };

export type RecommendationSummaryViewState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: RecommendationSummary }
  | { readonly status: 'not_generated' }
  | { readonly status: 'error'; readonly message: string };
