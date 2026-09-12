import type {
  InventoryItem,
  InventoryListFilters,
  InventoryListResult,
  InventoryStockStatus,
  StockMovementData,
  StockMovementResult,
  StockMovementType,
} from '@/features/inventory/types';
import {
  INVENTORY_STOCK_STATUSES,
  STOCK_MOVEMENT_TYPES,
} from '@/features/inventory/types';

export type InventoryServiceErrorCode =
  'inventory_unavailable' | 'inventory_item_not_found' | 'insufficient_stock';

/** Safe Inventory error for presentation and test boundaries. */
export class InventoryServiceError extends Error {
  constructor(
    public readonly code: InventoryServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InventoryServiceError';
  }
}

/**
 * Future Inventory integration implements this transport-independent contract.
 *
 * `listLowStock` represents the backend's dedicated low-stock endpoint. It is
 * intentionally separate from a stock-status filter because that endpoint
 * includes every active item at or below its minimum stock, including zero.
 */
export interface InventoryService {
  listInventory(filters: InventoryListFilters): Promise<InventoryListResult | null>;
  listLowStock(filters: InventoryListFilters): Promise<InventoryListResult | null>;
  createStockMovement(input: StockMovementData): Promise<StockMovementResult>;
}

/**
 * Production placeholder before Inventory API integration.
 *
 * It makes no network request and does not represent a stock movement as a
 * persistent write. A future HTTP adapter owns backend endpoint composition.
 */
export function createUnavailableInventoryService(): InventoryService {
  return {
    listInventory: () => Promise.resolve(null),
    listLowStock: () => Promise.resolve(null),
    createStockMovement: () =>
      Promise.reject(
        new InventoryServiceError(
          'inventory_unavailable',
          'Stock updates are not available yet.',
        ),
      ),
  };
}

/** Storage key read only by the Playwright-only Inventory service below. */
export const INVENTORY_E2E_STORAGE_KEY = 'invora-e2e-inventory-fixture';

export type InventoryE2EFixture =
  | {
      readonly state: 'ready';
      readonly data: InventoryListResult;
      /** Explicit projection returned by the backend low-stock endpoint. */
      readonly lowStockData: InventoryListResult;
    }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInventoryStatus(value: unknown): value is InventoryStockStatus {
  return (
    typeof value === 'string' &&
    INVENTORY_STOCK_STATUSES.includes(value as InventoryStockStatus)
  );
}

function isStockMovementType(value: unknown): value is StockMovementType {
  return (
    typeof value === 'string' &&
    STOCK_MOVEMENT_TYPES.includes(value as StockMovementType)
  );
}

function isInventoryItem(value: unknown): value is InventoryItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.productId === 'string' &&
    isRecord(value.product) &&
    typeof value.product.id === 'string' &&
    typeof value.product.name === 'string' &&
    typeof value.product.sku === 'string' &&
    (value.product.categoryId === null ||
      typeof value.product.categoryId === 'string') &&
    typeof value.product.unit === 'string' &&
    typeof value.product.isActive === 'boolean' &&
    isFiniteNumber(value.currentStock) &&
    isFiniteNumber(value.minimumStock) &&
    isFiniteNumber(value.safetyStock) &&
    isInventoryStatus(value.stockStatus) &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isInventoryListResult(value: unknown): value is InventoryListResult {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isInventoryItem) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.limit) &&
    isFiniteNumber(value.offset)
  );
}

function readE2EFixture(): InventoryE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'empty' };
  }

  const encodedFixture = window.sessionStorage.getItem(INVENTORY_E2E_STORAGE_KEY);
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
    if (
      value.state === 'ready' &&
      isInventoryListResult(value.data) &&
      isInventoryListResult(value.lowStockData)
    ) {
      return { state: 'ready', data: value.data, lowStockData: value.lowStockData };
    }
  } catch {
    // A malformed E2E fixture never crashes the application.
  }

  return { state: 'empty' };
}

function writeE2EFixture(fixture: InventoryE2EFixture): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(INVENTORY_E2E_STORAGE_KEY, JSON.stringify(fixture));
  }
}

function applyFilters(
  data: InventoryListResult,
  filters: InventoryListFilters,
): InventoryListResult {
  const query = filters.search.trim().toLocaleLowerCase();
  const items = data.items.filter((item) => {
    const matchesSearch =
      query === '' ||
      item.product.name.toLocaleLowerCase().includes(query) ||
      item.product.sku.toLocaleLowerCase().includes(query);
    const matchesStatus: boolean =
      filters.status === 'all' || item.stockStatus === filters.status;
    return matchesSearch && matchesStatus;
  });

  return { ...data, items, total: items.length };
}

function dataForWrite(
  fixture: InventoryE2EFixture,
): Extract<InventoryE2EFixture, { readonly state: 'ready' }> {
  if (fixture.state === 'ready') {
    return fixture;
  }
  throw new InventoryServiceError(
    'inventory_unavailable',
    'Stock updates are not available right now.',
  );
}

function movementQuantityAfter(currentStock: number, input: StockMovementData): number {
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity)) {
    throw new InventoryServiceError('inventory_unavailable', 'Unable to update stock.');
  }

  const quantityAfter =
    input.movementType === 'stock_in'
      ? currentStock + quantity
      : input.movementType === 'stock_out'
        ? currentStock - quantity
        : input.movementType === 'adjustment'
          ? quantity
          : currentStock + quantity;
  if (quantityAfter < 0) {
    throw new InventoryServiceError(
      'insufficient_stock',
      'Stock cannot be reduced below zero.',
    );
  }
  return quantityAfter;
}

function replaceStock(
  data: InventoryListResult,
  productId: string,
  quantityAfter: number,
): InventoryListResult {
  return {
    ...data,
    items: data.items.map((item) =>
      item.productId === productId
        ? {
            ...item,
            currentStock: quantityAfter,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  };
}

/**
 * Deterministic adapter selected only for the Playwright-managed build.
 *
 * Fixture state is supplied by each test, is session scoped, contains no
 * production inventory data, and is never selected by normal application builds.
 */
export function createE2EInventoryService(): InventoryService {
  return {
    listInventory: (filters) => {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new InventoryServiceError(
            'inventory_unavailable',
            'Unable to load inventory.',
          ),
        );
      }
      return Promise.resolve(
        fixture.state === 'ready' ? applyFilters(fixture.data, filters) : null,
      );
    },
    listLowStock: (filters) => {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new InventoryServiceError(
            'inventory_unavailable',
            'Unable to load inventory.',
          ),
        );
      }
      return Promise.resolve(
        fixture.state === 'ready' ? applyFilters(fixture.lowStockData, filters) : null,
      );
    },
    createStockMovement: (input) => {
      try {
        if (!isStockMovementType(input.movementType)) {
          return Promise.reject(
            new InventoryServiceError(
              'inventory_unavailable',
              'Unable to update stock.',
            ),
          );
        }
        const fixture = dataForWrite(readE2EFixture());
        const item = fixture.data.items.find(
          (inventoryItem) => inventoryItem.productId === input.productId,
        );
        if (item === undefined) {
          return Promise.reject(
            new InventoryServiceError(
              'inventory_item_not_found',
              'Unable to update stock.',
            ),
          );
        }
        const quantityAfter = movementQuantityAfter(item.currentStock, input);
        writeE2EFixture({
          state: 'ready',
          data: replaceStock(fixture.data, input.productId, quantityAfter),
          lowStockData: replaceStock(
            fixture.lowStockData,
            input.productId,
            quantityAfter,
          ),
        });
        return Promise.resolve({ productId: input.productId, quantityAfter });
      } catch (error: unknown) {
        return Promise.reject(error);
      }
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_INVENTORY_E2E_TEST_MODE === 'true';

/** The sole Inventory service selected for the current build. */
export const inventoryService: InventoryService = isE2ETestMode
  ? createE2EInventoryService()
  : createUnavailableInventoryService();
