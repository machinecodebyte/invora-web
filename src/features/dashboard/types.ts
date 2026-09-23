/**
 * Dashboard-facing projections of the Dashboard Analytics contract.
 *
 * Values are normalized by the Dashboard HTTP adapter (for example, backend
 * Decimal values become numbers) before they reach these render models.
 * These types intentionally do not model Product, Inventory, or Recommendation
 * entities beyond the summary fields exposed by Dashboard Analytics.
 */

export type DashboardInterval = 'day' | 'week' | 'month';

export type DashboardRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'overstocked';

export type DashboardStockStatus =
  'in_stock' | 'low_stock' | 'out_of_stock' | 'inactive';

export interface DashboardKpis {
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly totalSalesRecords: number;
  readonly totalInventoryItems: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly totalForecastRuns: number;
  readonly completedForecastRuns: number;
  readonly latestForecastMape: number | null;
  readonly openRecommendations: number;
  readonly highRiskRecommendations: number;
  readonly criticalRiskRecommendations: number;
  readonly totalReorderQuantity: number;
}

export interface DashboardDemandTrendPoint {
  /** ISO-8601 calendar date from Dashboard Analytics. */
  readonly period: string;
  readonly totalQuantitySold: number;
  readonly totalSalesAmount: number;
  readonly transactionCount: number;
}

export interface DashboardDemandTrends {
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly interval: DashboardInterval;
  readonly points: readonly DashboardDemandTrendPoint[];
}

export interface DashboardInventoryRiskItem {
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly safetyStock: number;
  readonly stockStatus: DashboardStockStatus;
}

export interface DashboardInventoryRisk {
  readonly totalInventoryItems: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly healthyStockCount: number;
  readonly inactiveInventoryCount: number;
  readonly lowStockItems: readonly DashboardInventoryRiskItem[];
  readonly outOfStockItems: readonly DashboardInventoryRiskItem[];
}

export type DashboardRecommendedAction =
  'reorder_now' | 'monitor' | 'no_reorder_needed' | 'overstock_review';

export interface DashboardReorderAlert {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly predictedDemand: number;
  readonly currentStock: number;
  readonly requiredStock: number;
  readonly reorderQuantity: number;
  readonly riskLevel: DashboardRiskLevel;
  readonly recommendedAction: DashboardRecommendedAction;
  readonly generatedAt: string;
}

export interface DashboardReorderAlerts {
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly overstockedCount: number;
  readonly openCount: number;
  readonly totalReorderQuantity: number;
  readonly topReorderItems: readonly DashboardReorderAlert[];
}

/** The Module 2 view projection of the backend's DashboardSummary response. */
export interface DashboardSummary {
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly kpis: DashboardKpis;
  readonly demandTrends: DashboardDemandTrends;
  readonly inventoryRisk: DashboardInventoryRisk;
  readonly reorderAlerts: DashboardReorderAlerts;
}

export type DashboardKpiKey =
  | 'totalProducts'
  | 'totalInventoryItems'
  | 'lowStockCount'
  | 'openRecommendations'
  | 'latestForecastMape';

export type DashboardKpiFormat = 'number' | 'percentage';

/** A render-ready metric derived from the Dashboard KPI projection. */
export interface DashboardKpi {
  readonly key: DashboardKpiKey;
  readonly label: string;
  readonly value: number | null;
  readonly format: DashboardKpiFormat;
  readonly description: string;
}

export type DashboardStatus = 'loading' | 'ready' | 'empty' | 'error';

/** Explicit, non-contradictory state for the Dashboard data boundary. */
export type DashboardViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: DashboardSummary }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string };
