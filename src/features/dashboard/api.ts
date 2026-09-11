import type {
  DashboardDemandTrendPoint,
  DashboardInventoryRisk,
  DashboardInventoryRiskItem,
  DashboardKpis,
  DashboardReorderAlert,
  DashboardReorderAlerts,
  DashboardSummary,
} from '@/features/dashboard/types';

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

/**
 * Future Dashboard Analytics integration implements this contract.
 *
 * It is deliberately independent from React and TanStack Query so an HTTP
 * adapter can be added later without changing presentation or test seams.
 */
export interface DashboardService {
  getDashboardSummary(): Promise<DashboardSummary | null>;
}

/**
 * The integration-phase adapter will use the shared API client. Until then no
 * request is made: `null` communicates an honest unavailable/no-data state.
 */
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasNumber(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'number';
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
    (value.latestForecastMape === null || typeof value.latestForecastMape === 'number')
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
    ['in_stock', 'low_stock', 'out_of_stock', 'inactive'].includes(
      String(value.stockStatus),
    )
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
    ['low', 'medium', 'high', 'critical', 'overstocked'].includes(
      String(value.riskLevel),
    ) &&
    ['reorder_now', 'monitor', 'no_reorder_needed', 'overstock_review'].includes(
      String(value.recommendedAction),
    ) &&
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
    typeof value.dateTo !== 'string'
  ) {
    return false;
  }

  if (!isRecord(value.demandTrends)) {
    return false;
  }

  return (
    isKpis(value.kpis) &&
    typeof value.demandTrends.dateFrom === 'string' &&
    typeof value.demandTrends.dateTo === 'string' &&
    ['day', 'week', 'month'].includes(String(value.demandTrends.interval)) &&
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

/**
 * Deterministic service selected only for the Playwright-managed build.
 *
 * It reads serialized fixtures supplied by E2E setup from sessionStorage. No
 * fake dashboard values live in production source, and this adapter is never
 * selected by the normal application build.
 */
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
  : createUnavailableDashboardService();
