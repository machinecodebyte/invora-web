import type { InventoryListResult } from '@/features/inventory/types';

/** Deterministic Inventory projections used exclusively by component and E2E tests. */
export const INVENTORY_FIXTURE: InventoryListResult = {
  items: [
    {
      id: 'inventory-cable-1',
      productId: 'product-cable-1',
      product: {
        id: 'product-cable-1',
        name: 'Widget Cable',
        sku: 'WGT-CBL-01',
        categoryId: null,
        unit: 'pcs',
        isActive: true,
      },
      currentStock: 24,
      minimumStock: 5,
      safetyStock: 8,
      stockStatus: 'in_stock',
      isActive: true,
      createdAt: '2026-02-01T12:00:00Z',
      updatedAt: '2026-02-02T12:00:00Z',
    },
    {
      id: 'inventory-powder-1',
      productId: 'product-powder-1',
      product: {
        id: 'product-powder-1',
        name: 'Widget Powder',
        sku: 'WGT-PWD-01',
        categoryId: null,
        unit: 'kg',
        isActive: true,
      },
      currentStock: 2.5,
      minimumStock: 5,
      safetyStock: 8,
      stockStatus: 'low_stock',
      isActive: true,
      createdAt: '2026-02-03T12:00:00Z',
      updatedAt: '2026-02-04T12:00:00Z',
    },
    {
      id: 'inventory-zero-1',
      productId: 'product-zero-1',
      product: {
        id: 'product-zero-1',
        name: 'Widget Zero',
        sku: 'WGT-ZERO-01',
        categoryId: null,
        unit: 'pcs',
        isActive: true,
      },
      currentStock: 0,
      minimumStock: 3,
      safetyStock: 3,
      stockStatus: 'out_of_stock',
      isActive: true,
      createdAt: '2026-02-05T12:00:00Z',
      updatedAt: '2026-02-06T12:00:00Z',
    },
    {
      id: 'inventory-archive-1',
      productId: 'product-archive-1',
      product: {
        id: 'product-archive-1',
        name: 'Widget Archive',
        sku: 'WGT-ARC-01',
        categoryId: null,
        unit: 'box',
        isActive: false,
      },
      currentStock: 10,
      minimumStock: 2,
      safetyStock: 2,
      stockStatus: 'inactive',
      isActive: false,
      createdAt: '2026-02-07T12:00:00Z',
      updatedAt: '2026-02-08T12:00:00Z',
    },
  ],
  total: 4,
  limit: 200,
  offset: 0,
};

/** Explicit low-stock endpoint fixture: at/below-minimum active items, including zero. */
export const LOW_STOCK_INVENTORY_FIXTURE: InventoryListResult = {
  items: [INVENTORY_FIXTURE.items[1]!, INVENTORY_FIXTURE.items[2]!],
  total: 2,
  limit: 200,
  offset: 0,
};

/** Successful Inventory response without any records. */
export const EMPTY_INVENTORY_FIXTURE: InventoryListResult = {
  items: [],
  total: 0,
  limit: 200,
  offset: 0,
};

/** Successful full inventory response whose low-stock endpoint is empty. */
export const NO_LOW_STOCK_INVENTORY_FIXTURE: InventoryListResult = {
  items: [INVENTORY_FIXTURE.items[0]!],
  total: 1,
  limit: 200,
  offset: 0,
};
