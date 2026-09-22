/**
 * Product Catalog render and adapter contracts.
 *
 * These represent only the safe public product fields returned by the future
 * API adapter. Inventory quantities, vendor data, and other modules remain
 * deliberately outside this feature.
 */

export const PRODUCT_UNITS = [
  'pcs',
  'kg',
  'gram',
  'liter',
  'ml',
  'box',
  'packet',
  'dozen',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];
export type ProductStatus = 'active' | 'inactive';
export type ProductFilterStatus = 'all' | ProductStatus;

export interface Product {
  readonly id: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly sku: string;
  readonly description: string | null;
  readonly unit: ProductUnit;
  readonly sellingPrice: number;
  readonly costPrice: number | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Data accepted by the future Product Catalog create adapter. */
export interface ProductCreateData {
  readonly categoryId?: string | null;
  readonly name: string;
  readonly sku: string;
  readonly description: string | null;
  readonly unit: ProductUnit;
  readonly sellingPrice: number;
  readonly costPrice: number | null;
}

/** Data accepted by the future Product Catalog update adapter. */
export interface ProductUpdateData extends ProductCreateData {
  readonly isActive: boolean;
}

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductCategoryData {
  readonly name: string;
  readonly description: string | null;
  readonly isActive?: boolean;
}

export interface ProductCategoryListResult {
  readonly categories: readonly ProductCategory[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface ProductListFilters {
  readonly search: string;
  readonly status: ProductFilterStatus;
}

export interface ProductListResult {
  readonly products: readonly Product[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export type ProductsViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: ProductListResult }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string };

export type ProductPendingAction = 'create' | 'update' | null;
