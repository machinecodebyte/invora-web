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
import { isApiError } from '@/lib/api-error';
import { apiClient, type ApiClient } from '@/lib/api-client';

export type InventoryServiceErrorCode =
  | 'inventory_unavailable'
  | 'inventory_item_not_found'
  | 'inventory_product_not_found'
  | 'insufficient_stock';

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

type InventoryProductWire = {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly category_id: string | null;
  readonly unit: string;
  readonly is_active: boolean;
};

type InventoryItemWire = {
  readonly id: string;
  readonly product_id: string;
  readonly product: InventoryProductWire;
  readonly current_stock: number | string;
  readonly minimum_stock: number | string;
  readonly safety_stock: number | string;
  readonly stock_status: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
};

type StockMovementWire = {
  readonly product_id: string;
  readonly quantity_after: number | string;
};

function invalidInventoryResponse(): InventoryServiceError {
  return new InventoryServiceError(
    'inventory_unavailable',
    'The server returned an unexpected inventory response.',
  );
}

function isInventoryProductWire(value: unknown): value is InventoryProductWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.sku === 'string' &&
    (value.category_id === null || typeof value.category_id === 'string') &&
    typeof value.unit === 'string' &&
    typeof value.is_active === 'boolean'
  );
}

function isInventoryItemWire(value: unknown): value is InventoryItemWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.product_id === 'string' &&
    isInventoryProductWire(value.product) &&
    (typeof value.current_stock === 'number' ||
      typeof value.current_stock === 'string') &&
    (typeof value.minimum_stock === 'number' ||
      typeof value.minimum_stock === 'string') &&
    (typeof value.safety_stock === 'number' ||
      typeof value.safety_stock === 'string') &&
    typeof value.stock_status === 'string' &&
    typeof value.is_active === 'boolean' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

function isStockMovementWire(value: unknown): value is StockMovementWire {
  return (
    isRecord(value) &&
    typeof value.product_id === 'string' &&
    (typeof value.quantity_after === 'number' ||
      typeof value.quantity_after === 'string')
  );
}

function mapQuantity(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw invalidInventoryResponse();
  }
  return parsed;
}

export function mapInventoryItemResponse(value: unknown): InventoryItem {
  if (!isInventoryItemWire(value) || !isInventoryStatus(value.stock_status)) {
    throw invalidInventoryResponse();
  }

  return {
    id: value.id,
    productId: value.product_id,
    product: {
      id: value.product.id,
      name: value.product.name,
      sku: value.product.sku,
      categoryId: value.product.category_id,
      unit: value.product.unit,
      isActive: value.product.is_active,
    },
    currentStock: mapQuantity(value.current_stock),
    minimumStock: mapQuantity(value.minimum_stock),
    safetyStock: mapQuantity(value.safety_stock),
    stockStatus: value.stock_status,
    isActive: value.is_active,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapInventoryListResponse(value: unknown): InventoryListResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !isFiniteNumber(value.total) ||
    !isFiniteNumber(value.limit) ||
    !isFiniteNumber(value.offset)
  ) {
    throw invalidInventoryResponse();
  }

  return {
    items: value.items.map(mapInventoryItemResponse),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

export function mapStockMovementResponse(value: unknown): StockMovementResult {
  if (!isRecord(value) || !isStockMovementWire(value.movement)) {
    throw invalidInventoryResponse();
  }
  const movement = value.movement;

  return {
    productId: movement.product_id,
    quantityAfter: mapQuantity(movement.quantity_after),
  };
}

function toInventoryListQuery(
  filters: InventoryListFilters,
): Record<string, string | number | null> {
  return {
    search: filters.search.trim() || null,
    stock_status: filters.status === 'all' ? null : filters.status,
    limit: 200,
    offset: 0,
    sort_by: 'updated_at',
    sort_order: 'desc',
  };
}

function toInventoryMovementRequest(
  input: StockMovementData,
): Record<string, string | null> {
  return {
    product_id: input.productId,
    movement_type: input.movementType,
    quantity: input.quantity,
    reason: input.reason,
  };
}

function normalizeInventoryError(error: unknown): never {
  if (isApiError(error)) {
    if (error.code === 'insufficient_stock') {
      throw new InventoryServiceError(
        'insufficient_stock',
        'Insufficient stock for this movement.',
      );
    }
    if (error.code === 'inventory_item_not_found') {
      throw new InventoryServiceError(
        'inventory_item_not_found',
        'Inventory is not configured for this product.',
      );
    }
    if (error.code === 'inventory_product_not_found') {
      throw new InventoryServiceError(
        'inventory_product_not_found',
        'The selected product is not available.',
      );
    }
  }
  throw error;
}

/** Real FastAPI Inventory adapter for normal application builds. */
export function createHttpInventoryService(
  client: ApiClient = apiClient,
): InventoryService {
  return {
    async listInventory(filters) {
      try {
        return mapInventoryListResponse(
          await client.get<unknown>('/api/v1/inventory/items', {
            query: toInventoryListQuery(filters),
          }),
        );
      } catch (error) {
        return normalizeInventoryError(error);
      }
    },
    async listLowStock(filters) {
      try {
        const data = mapInventoryListResponse(
          await client.get<unknown>('/api/v1/inventory/low-stock', {
            query: { limit: 200, offset: 0 },
          }),
        );
        // The dedicated endpoint owns threshold evaluation. Its current public
        // contract has no search/status parameters, so these existing controls
        // refine only that backend-authoritative projection for presentation.
        return applyFilters(data, filters);
      } catch (error) {
        return normalizeInventoryError(error);
      }
    },
    async createStockMovement(input) {
      try {
        return mapStockMovementResponse(
          await client.post<unknown>(
            '/api/v1/inventory/movements',
            toInventoryMovementRequest(input),
          ),
        );
      } catch (error) {
        return normalizeInventoryError(error);
      }
    },
  };
}

/**
 * Deliberately unavailable seam retained for isolated tests.
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
  : createHttpInventoryService();
