/**
 * Inventory projections used by the frontend Inventory feature only.
 *
 * Quantities are represented as numbers after a future adapter has normalized
 * backend Decimal values. Stock-movement input preserves its quantity as text,
 * avoiding precision loss at the form-to-transport boundary.
 */

export const INVENTORY_STOCK_STATUSES = [
  'in_stock',
  'low_stock',
  'out_of_stock',
  'inactive',
] as const;

export const STOCK_MOVEMENT_TYPES = [
  'stock_in',
  'stock_out',
  'adjustment',
  'correction',
] as const;

export type InventoryStockStatus = (typeof INVENTORY_STOCK_STATUSES)[number];
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
export type InventoryFilterStatus = 'all' | InventoryStockStatus;
export type InventoryView = 'all' | 'low_stock';

/** Safe Product Catalog projection embedded in Inventory responses. */
export interface InventoryProduct {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly categoryId: string | null;
  readonly unit: string;
  readonly isActive: boolean;
}

/** Public inventory fields returned by the future Inventory API adapter. */
export interface InventoryItem {
  readonly id: string;
  readonly productId: string;
  readonly product: InventoryProduct;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly safetyStock: number;
  readonly stockStatus: InventoryStockStatus;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryListResult {
  readonly items: readonly InventoryItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/** Only filters supported by the inspected Inventory read contract are exposed. */
export interface InventoryListFilters {
  readonly search: string;
  readonly status: InventoryFilterStatus;
  readonly view: InventoryView;
}

/** Data accepted by the future immutable stock-movement adapter. */
export interface StockMovementData {
  readonly productId: string;
  readonly movementType: StockMovementType;
  /** Decimal text is retained so the future HTTP adapter can send it losslessly. */
  readonly quantity: string;
  readonly reason: string | null;
}

/** The small subset of a movement response needed to refresh this screen. */
export interface StockMovementResult {
  readonly productId: string;
  readonly quantityAfter: number;
}

export type InventoryViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: InventoryListResult }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string };

export type InventoryPendingAction = 'stock_update' | null;
