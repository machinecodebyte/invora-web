import type {
  DashboardDemandTrendPoint,
  DashboardInterval,
  DashboardInventoryRisk,
  DashboardInventoryRiskItem,
  DashboardKpis,
  DashboardRecommendedAction,
  DashboardReorderAlert,
  DashboardReorderAlerts,
  DashboardRiskLevel,
  DashboardStockStatus,
  DashboardSummary,
} from '@/features/dashboard/types';
import { apiClient, type ApiClient } from '@/lib/api-client';

export type DashboardServiceErrorCode = 'dashboard_unavailable';

/** Safe feature-level error for the Dashboard presentation boundary. */
export class DashboardServiceError extends Error {
  constructor(
    public readonly code: DashboardServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DashboardServiceError';
  }
}

/** Caller-owned request options; Dashboard has no current UI filters. */
export interface DashboardSummaryRequestOptions {
  readonly signal?: AbortSignal | undefined;
}

/** Transport-independent Dashboard summary contract. */
export interface DashboardService {
  getDashboardSummary(
    options?: DashboardSummaryRequestOptions,
  ): Promise<DashboardSummary | null>;
}

type DecimalWireValue = number | string;

type DashboardKpisWire = {
  readonly total_products: number;
  readonly active_products: number;
  readonly total_sales_records: number;
  readonly total_inventory_items: number;
  readonly low_stock_count: number;
  readonly out_of_stock_count: number;
  readonly total_forecast_runs: number;
  readonly completed_forecast_runs: number;
  readonly latest_forecast_mape: DecimalWireValue | null;
  readonly open_recommendations: number;
  readonly high_risk_recommendations: number;
  readonly critical_risk_recommendations: number;
  readonly total_reorder_quantity: DecimalWireValue;
};

type DashboardDemandTrendPointWire = {
  readonly period: string;
  readonly total_quantity_sold: DecimalWireValue;
  readonly total_sales_amount: DecimalWireValue;
  readonly transaction_count: number;
};

type DashboardDemandTrendsWire = {
  readonly date_from: string;
  readonly date_to: string;
  readonly interval: DashboardInterval;
  readonly points: readonly DashboardDemandTrendPointWire[];
};

type DashboardInventoryRiskItemWire = {
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly current_stock: DecimalWireValue;
  readonly minimum_stock: DecimalWireValue;
  readonly safety_stock: DecimalWireValue;
  readonly stock_status: DashboardStockStatus;
};

type DashboardInventoryRiskWire = {
  readonly total_inventory_items: number;
  readonly low_stock_count: number;
  readonly out_of_stock_count: number;
  readonly healthy_stock_count: number;
  readonly inactive_inventory_count: number;
  readonly low_stock_items: readonly DashboardInventoryRiskItemWire[];
  readonly out_of_stock_items: readonly DashboardInventoryRiskItemWire[];
};

type DashboardReorderAlertWire = {
  readonly id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly predicted_demand: DecimalWireValue;
  readonly current_stock: DecimalWireValue;
  readonly required_stock: DecimalWireValue;
  readonly reorder_quantity: DecimalWireValue;
  readonly risk_level: DashboardRiskLevel;
  readonly recommended_action: DashboardRecommendedAction;
  readonly generated_at: string;
};

type DashboardReorderAlertsWire = {
  readonly critical_count: number;
  readonly high_count: number;
  readonly medium_count: number;
  readonly low_count: number;
  readonly overstocked_count: number;
  readonly open_count: number;
  readonly total_reorder_quantity: DecimalWireValue;
  readonly top_reorder_items: readonly DashboardReorderAlertWire[];
};

type DashboardSummaryWire = {
  readonly date_from: string;
  readonly date_to: string;
  readonly kpis: DashboardKpisWire;
  readonly demand_trends: DashboardDemandTrendsWire;
  readonly inventory_risk: DashboardInventoryRiskWire;
  readonly reorder_alerts: DashboardReorderAlertsWire;
};

const DASHBOARD_INTERVALS: readonly DashboardInterval[] = ['day', 'week', 'month'];
const DASHBOARD_STOCK_STATUSES: readonly DashboardStockStatus[] = [
  'in_stock',
  'low_stock',
  'out_of_stock',
  'inactive',
];
const DASHBOARD_RISK_LEVELS: readonly DashboardRiskLevel[] = [
  'low',
  'medium',
  'high',
  'critical',
  'overstocked',
];
const DASHBOARD_RECOMMENDED_ACTIONS: readonly DashboardRecommendedAction[] = [
  'reorder_now',
  'monitor',
  'no_reorder_needed',
  'overstock_review',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDecimalWireValue(value: unknown): value is DecimalWireValue {
  return typeof value === 'number' || typeof value === 'string';
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function isDashboardInterval(value: unknown): value is DashboardInterval {
  return (
    typeof value === 'string' &&
    DASHBOARD_INTERVALS.includes(value as DashboardInterval)
  );
}

function isDashboardStockStatus(value: unknown): value is DashboardStockStatus {
  return (
    typeof value === 'string' &&
    DASHBOARD_STOCK_STATUSES.includes(value as DashboardStockStatus)
  );
}

function isDashboardRiskLevel(value: unknown): value is DashboardRiskLevel {
  return (
    typeof value === 'string' &&
    DASHBOARD_RISK_LEVELS.includes(value as DashboardRiskLevel)
  );
}

function isDashboardRecommendedAction(
  value: unknown,
): value is DashboardRecommendedAction {
  return (
    typeof value === 'string' &&
    DASHBOARD_RECOMMENDED_ACTIONS.includes(value as DashboardRecommendedAction)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function hasFiniteNumbers(
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => isFiniteNumber(record[key]));
}

function invalidDashboardResponse(): DashboardServiceError {
  return new DashboardServiceError(
    'dashboard_unavailable',
    'The server returned an unexpected dashboard response.',
  );
}

function mapDecimal(value: DecimalWireValue): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw invalidDashboardResponse();
  }
  return parsed;
}

function isDashboardKpisWire(value: unknown): value is DashboardKpisWire {
  return (
    isRecord(value) &&
    hasFiniteNumbers(value, [
      'total_products',
      'active_products',
      'total_sales_records',
      'total_inventory_items',
      'low_stock_count',
      'out_of_stock_count',
      'total_forecast_runs',
      'completed_forecast_runs',
      'open_recommendations',
      'high_risk_recommendations',
      'critical_risk_recommendations',
    ]) &&
    isDecimalWireValue(value.total_reorder_quantity) &&
    (value.latest_forecast_mape === null ||
      isDecimalWireValue(value.latest_forecast_mape))
  );
}

function isDashboardDemandTrendPointWire(
  value: unknown,
): value is DashboardDemandTrendPointWire {
  return (
    isRecord(value) &&
    isDateOnly(value.period) &&
    isDecimalWireValue(value.total_quantity_sold) &&
    isDecimalWireValue(value.total_sales_amount) &&
    isFiniteNumber(value.transaction_count)
  );
}

function isDashboardDemandTrendsWire(
  value: unknown,
): value is DashboardDemandTrendsWire {
  return (
    isRecord(value) &&
    isDateOnly(value.date_from) &&
    isDateOnly(value.date_to) &&
    isDashboardInterval(value.interval) &&
    Array.isArray(value.points) &&
    value.points.every(isDashboardDemandTrendPointWire)
  );
}

function isDashboardInventoryRiskItemWire(
  value: unknown,
): value is DashboardInventoryRiskItemWire {
  return (
    isRecord(value) &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isDecimalWireValue(value.current_stock) &&
    isDecimalWireValue(value.minimum_stock) &&
    isDecimalWireValue(value.safety_stock) &&
    isDashboardStockStatus(value.stock_status)
  );
}

function isDashboardInventoryRiskWire(
  value: unknown,
): value is DashboardInventoryRiskWire {
  return (
    isRecord(value) &&
    hasFiniteNumbers(value, [
      'total_inventory_items',
      'low_stock_count',
      'out_of_stock_count',
      'healthy_stock_count',
      'inactive_inventory_count',
    ]) &&
    Array.isArray(value.low_stock_items) &&
    value.low_stock_items.every(isDashboardInventoryRiskItemWire) &&
    Array.isArray(value.out_of_stock_items) &&
    value.out_of_stock_items.every(isDashboardInventoryRiskItemWire)
  );
}

function isDashboardReorderAlertWire(
  value: unknown,
): value is DashboardReorderAlertWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    typeof value.sku === 'string' &&
    isNullableString(value.category_id) &&
    isNullableString(value.category_name) &&
    isDecimalWireValue(value.predicted_demand) &&
    isDecimalWireValue(value.current_stock) &&
    isDecimalWireValue(value.required_stock) &&
    isDecimalWireValue(value.reorder_quantity) &&
    isDashboardRiskLevel(value.risk_level) &&
    isDashboardRecommendedAction(value.recommended_action) &&
    typeof value.generated_at === 'string'
  );
}

function isDashboardReorderAlertsWire(
  value: unknown,
): value is DashboardReorderAlertsWire {
  return (
    isRecord(value) &&
    hasFiniteNumbers(value, [
      'critical_count',
      'high_count',
      'medium_count',
      'low_count',
      'overstocked_count',
      'open_count',
    ]) &&
    isDecimalWireValue(value.total_reorder_quantity) &&
    Array.isArray(value.top_reorder_items) &&
    value.top_reorder_items.every(isDashboardReorderAlertWire)
  );
}

function isDashboardSummaryWire(value: unknown): value is DashboardSummaryWire {
  return (
    isRecord(value) &&
    isDateOnly(value.date_from) &&
    isDateOnly(value.date_to) &&
    isDashboardKpisWire(value.kpis) &&
    isDashboardDemandTrendsWire(value.demand_trends) &&
    isDashboardInventoryRiskWire(value.inventory_risk) &&
    isDashboardReorderAlertsWire(value.reorder_alerts)
  );
}

export function mapDashboardKpisResponse(value: unknown): DashboardKpis {
  if (!isDashboardKpisWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    totalProducts: value.total_products,
    activeProducts: value.active_products,
    totalSalesRecords: value.total_sales_records,
    totalInventoryItems: value.total_inventory_items,
    lowStockCount: value.low_stock_count,
    outOfStockCount: value.out_of_stock_count,
    totalForecastRuns: value.total_forecast_runs,
    completedForecastRuns: value.completed_forecast_runs,
    latestForecastMape:
      value.latest_forecast_mape === null
        ? null
        : mapDecimal(value.latest_forecast_mape),
    openRecommendations: value.open_recommendations,
    highRiskRecommendations: value.high_risk_recommendations,
    criticalRiskRecommendations: value.critical_risk_recommendations,
    totalReorderQuantity: mapDecimal(value.total_reorder_quantity),
  };
}

export function mapDashboardDemandTrendPointResponse(
  value: unknown,
): DashboardDemandTrendPoint {
  if (!isDashboardDemandTrendPointWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    period: value.period,
    totalQuantitySold: mapDecimal(value.total_quantity_sold),
    totalSalesAmount: mapDecimal(value.total_sales_amount),
    transactionCount: value.transaction_count,
  };
}

export function mapDashboardInventoryRiskItemResponse(
  value: unknown,
): DashboardInventoryRiskItem {
  if (!isDashboardInventoryRiskItemWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryId: value.category_id,
    categoryName: value.category_name,
    currentStock: mapDecimal(value.current_stock),
    minimumStock: mapDecimal(value.minimum_stock),
    safetyStock: mapDecimal(value.safety_stock),
    stockStatus: value.stock_status,
  };
}

export function mapDashboardInventoryRiskResponse(
  value: unknown,
): DashboardInventoryRisk {
  if (!isDashboardInventoryRiskWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    totalInventoryItems: value.total_inventory_items,
    lowStockCount: value.low_stock_count,
    outOfStockCount: value.out_of_stock_count,
    healthyStockCount: value.healthy_stock_count,
    inactiveInventoryCount: value.inactive_inventory_count,
    lowStockItems: value.low_stock_items.map(mapDashboardInventoryRiskItemResponse),
    outOfStockItems: value.out_of_stock_items.map(
      mapDashboardInventoryRiskItemResponse,
    ),
  };
}

export function mapDashboardReorderAlertResponse(
  value: unknown,
): DashboardReorderAlert {
  if (!isDashboardReorderAlertWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    id: value.id,
    productId: value.product_id,
    productName: value.product_name,
    sku: value.sku,
    categoryId: value.category_id,
    categoryName: value.category_name,
    predictedDemand: mapDecimal(value.predicted_demand),
    currentStock: mapDecimal(value.current_stock),
    requiredStock: mapDecimal(value.required_stock),
    reorderQuantity: mapDecimal(value.reorder_quantity),
    riskLevel: value.risk_level,
    recommendedAction: value.recommended_action,
    generatedAt: value.generated_at,
  };
}

export function mapDashboardReorderAlertsResponse(
  value: unknown,
): DashboardReorderAlerts {
  if (!isDashboardReorderAlertsWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    criticalCount: value.critical_count,
    highCount: value.high_count,
    mediumCount: value.medium_count,
    lowCount: value.low_count,
    overstockedCount: value.overstocked_count,
    openCount: value.open_count,
    totalReorderQuantity: mapDecimal(value.total_reorder_quantity),
    topReorderItems: value.top_reorder_items.map(mapDashboardReorderAlertResponse),
  };
}

/** Maps the rendered Module 2 projection from the unwrapped Dashboard summary. */
export function mapDashboardSummaryResponse(value: unknown): DashboardSummary {
  if (!isDashboardSummaryWire(value)) {
    throw invalidDashboardResponse();
  }
  return {
    dateFrom: value.date_from,
    dateTo: value.date_to,
    kpis: mapDashboardKpisResponse(value.kpis),
    demandTrends: {
      dateFrom: value.demand_trends.date_from,
      dateTo: value.demand_trends.date_to,
      interval: value.demand_trends.interval,
      points: value.demand_trends.points.map(mapDashboardDemandTrendPointResponse),
    },
    inventoryRisk: mapDashboardInventoryRiskResponse(value.inventory_risk),
    reorderAlerts: mapDashboardReorderAlertsResponse(value.reorder_alerts),
  };
}

/** Real FastAPI Dashboard Summary adapter for normal application builds. */
export function createHttpDashboardService(
  client: ApiClient = apiClient,
): DashboardService {
  return {
    async getDashboardSummary(options) {
      const data = await client.get<unknown>('/api/v1/dashboard/summary', {
        ...(options?.signal === undefined ? {} : { signal: options.signal }),
      });
      return mapDashboardSummaryResponse(data);
    },
  };
}

/** Test-only unavailable seam; normal application builds use the HTTP adapter. */
export function createUnavailableDashboardService(): DashboardService {
  return {
    getDashboardSummary: () => Promise.resolve(null),
  };
}

/** Storage key read only by the Playwright-only service below. */
export const DASHBOARD_E2E_STORAGE_KEY = 'invora-e2e-dashboard-fixture';

type DashboardE2EFixture =
  | { readonly state: 'ready'; readonly data: DashboardSummary }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

function hasNumber(record: Record<string, unknown>, key: string): boolean {
  return isFiniteNumber(record[key]);
}

function isKpis(value: unknown): value is DashboardKpis {
  if (!isRecord(value)) {
    return false;
  }

  return (
    [
      'totalProducts',
      'activeProducts',
      'totalSalesRecords',
      'totalInventoryItems',
      'lowStockCount',
      'outOfStockCount',
      'totalForecastRuns',
      'completedForecastRuns',
      'openRecommendations',
      'highRiskRecommendations',
      'criticalRiskRecommendations',
      'totalReorderQuantity',
    ].every((key) => hasNumber(value, key)) &&
    (value.latestForecastMape === null || isFiniteNumber(value.latestForecastMape))
  );
}

function isTrendPoint(value: unknown): value is DashboardDemandTrendPoint {
  return (
    isRecord(value) &&
    typeof value.period === 'string' &&
    hasNumber(value, 'totalQuantitySold') &&
    hasNumber(value, 'totalSalesAmount') &&
    hasNumber(value, 'transactionCount')
  );
}

function isInventoryRiskItem(value: unknown): value is DashboardInventoryRiskItem {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.sku === 'string' &&
    (value.categoryId === null || typeof value.categoryId === 'string') &&
    (value.categoryName === null || typeof value.categoryName === 'string') &&
    hasNumber(value, 'currentStock') &&
    hasNumber(value, 'minimumStock') &&
    hasNumber(value, 'safetyStock') &&
    isDashboardStockStatus(value.stockStatus)
  );
}

function isInventoryRisk(value: unknown): value is DashboardInventoryRisk {
  if (!isRecord(value)) {
    return false;
  }

  return (
    [
      'totalInventoryItems',
      'lowStockCount',
      'outOfStockCount',
      'healthyStockCount',
      'inactiveInventoryCount',
    ].every((key) => hasNumber(value, key)) &&
    Array.isArray(value.lowStockItems) &&
    value.lowStockItems.every(isInventoryRiskItem) &&
    Array.isArray(value.outOfStockItems) &&
    value.outOfStockItems.every(isInventoryRiskItem)
  );
}

function isReorderAlert(value: unknown): value is DashboardReorderAlert {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.productId === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.sku === 'string' &&
    (value.categoryId === null || typeof value.categoryId === 'string') &&
    (value.categoryName === null || typeof value.categoryName === 'string') &&
    hasNumber(value, 'predictedDemand') &&
    hasNumber(value, 'currentStock') &&
    hasNumber(value, 'requiredStock') &&
    hasNumber(value, 'reorderQuantity') &&
    isDashboardRiskLevel(value.riskLevel) &&
    isDashboardRecommendedAction(value.recommendedAction) &&
    typeof value.generatedAt === 'string'
  );
}

function isReorderAlerts(value: unknown): value is DashboardReorderAlerts {
  if (!isRecord(value)) {
    return false;
  }

  return (
    [
      'criticalCount',
      'highCount',
      'mediumCount',
      'lowCount',
      'overstockedCount',
      'openCount',
      'totalReorderQuantity',
    ].every((key) => hasNumber(value, key)) &&
    Array.isArray(value.topReorderItems) &&
    value.topReorderItems.every(isReorderAlert)
  );
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (
    !isRecord(value) ||
    typeof value.dateFrom !== 'string' ||
    typeof value.dateTo !== 'string' ||
    !isRecord(value.demandTrends)
  ) {
    return false;
  }

  return (
    isKpis(value.kpis) &&
    typeof value.demandTrends.dateFrom === 'string' &&
    typeof value.demandTrends.dateTo === 'string' &&
    isDashboardInterval(value.demandTrends.interval) &&
    Array.isArray(value.demandTrends.points) &&
    value.demandTrends.points.every(isTrendPoint) &&
    isInventoryRisk(value.inventoryRisk) &&
    isReorderAlerts(value.reorderAlerts)
  );
}

function readE2EFixture(): DashboardE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'empty' };
  }

  const encodedFixture = window.sessionStorage.getItem(DASHBOARD_E2E_STORAGE_KEY);
  if (encodedFixture === null) {
    return { state: 'empty' };
  }

  try {
    const value: unknown = JSON.parse(encodedFixture);
    if (!isRecord(value)) {
      return { state: 'empty' };
    }
    if (value.state === 'error') {
      return { state: 'error' };
    }
    if (value.state === 'ready' && isDashboardSummary(value.data)) {
      return { state: 'ready', data: value.data };
    }
  } catch {
    // A malformed test fixture is treated as unavailable rather than crashing
    // the application. Normal builds never reach this test-only code path.
  }

  return { state: 'empty' };
}

/** Deterministic adapter selected only by Playwright's explicit build flag. */
export function createE2EDashboardService(): DashboardService {
  return {
    getDashboardSummary: () => {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new DashboardServiceError(
            'dashboard_unavailable',
            'Unable to load dashboard data.',
          ),
        );
      }
      return Promise.resolve(fixture.state === 'ready' ? fixture.data : null);
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_DASHBOARD_E2E_TEST_MODE === 'true';

/** The sole Dashboard service selected for the current build. */
export const dashboardService: DashboardService = isE2ETestMode
  ? createE2EDashboardService()
  : createHttpDashboardService();
