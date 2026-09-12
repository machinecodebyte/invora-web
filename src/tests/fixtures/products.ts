import type { ProductListResult } from '@/features/products/types';

/** Deterministic Product Catalog projection used exclusively by tests and E2E. */
export const PRODUCTS_FIXTURE: ProductListResult = {
  products: [
    {
      id: 'product-cable-1',
      categoryId: null,
      name: 'Widget Cable',
      sku: 'WGT-CBL-01',
      description: 'A durable widget cable.',
      unit: 'pcs',
      sellingPrice: 24.5,
      costPrice: 12.25,
      isActive: true,
      createdAt: '2026-02-01T12:00:00Z',
      updatedAt: '2026-02-02T12:00:00Z',
    },
    {
      id: 'product-powder-1',
      categoryId: null,
      name: 'Widget Powder',
      sku: 'WGT-PWD-01',
      description: null,
      unit: 'kg',
      sellingPrice: 18,
      costPrice: null,
      isActive: false,
      createdAt: '2026-02-03T12:00:00Z',
      updatedAt: '2026-02-04T12:00:00Z',
    },
  ],
  total: 2,
  limit: 200,
  offset: 0,
};

/** Successful Product Catalog list response without product records. */
export const EMPTY_PRODUCTS_FIXTURE: ProductListResult = {
  products: [],
  total: 0,
  limit: 200,
  offset: 0,
};
