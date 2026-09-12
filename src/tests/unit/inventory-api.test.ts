import { afterEach, describe, expect, it } from 'vitest';

import {
  INVENTORY_E2E_STORAGE_KEY,
  InventoryServiceError,
  createE2EInventoryService,
  createUnavailableInventoryService,
} from '@/features/inventory/api';
import {
  EMPTY_INVENTORY_FIXTURE,
  INVENTORY_FIXTURE,
  LOW_STOCK_INVENTORY_FIXTURE,
} from '@/tests/fixtures/inventory';

const allFilters = { search: '', status: 'all', view: 'all' } as const;

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Inventory service adapters', () => {
  it('keeps the normal service unavailable without performing a write', async () => {
    const service = createUnavailableInventoryService();

    await expect(service.listInventory(allFilters)).resolves.toBeNull();
    await expect(
      service.createStockMovement({
        productId: 'product-1',
        movementType: 'stock_in',
        quantity: '1',
        reason: null,
      }),
    ).rejects.toMatchObject({ code: 'inventory_unavailable' });
  });

  it('uses only the explicit E2E low-stock projection and backend-aligned filters', async () => {
    window.sessionStorage.setItem(
      INVENTORY_E2E_STORAGE_KEY,
      JSON.stringify({
        state: 'ready',
        data: INVENTORY_FIXTURE,
        lowStockData: LOW_STOCK_INVENTORY_FIXTURE,
      }),
    );
    const service = createE2EInventoryService();

    await expect(
      service.listLowStock({ search: '', status: 'all', view: 'low_stock' }),
    ).resolves.toEqual(LOW_STOCK_INVENTORY_FIXTURE);
    await expect(
      service.listInventory({ search: 'cable', status: 'in_stock', view: 'all' }),
    ).resolves.toMatchObject({ total: 1, items: [INVENTORY_FIXTURE.items[0]] });
  });

  it('applies stock movement semantics only in the E2E fixture adapter', async () => {
    window.sessionStorage.setItem(
      INVENTORY_E2E_STORAGE_KEY,
      JSON.stringify({
        state: 'ready',
        data: INVENTORY_FIXTURE,
        lowStockData: LOW_STOCK_INVENTORY_FIXTURE,
      }),
    );
    const service = createE2EInventoryService();

    await expect(
      service.createStockMovement({
        productId: 'product-cable-1',
        movementType: 'stock_in',
        quantity: '3',
        reason: null,
      }),
    ).resolves.toEqual({ productId: 'product-cable-1', quantityAfter: 27 });

    await expect(
      service.createStockMovement({
        productId: 'product-cable-1',
        movementType: 'stock_out',
        quantity: '28',
        reason: null,
      }),
    ).rejects.toEqual(
      new InventoryServiceError(
        'insufficient_stock',
        'Stock cannot be reduced below zero.',
      ),
    );
  });

  it('treats malformed fixture state as empty rather than crashing', async () => {
    window.sessionStorage.setItem(INVENTORY_E2E_STORAGE_KEY, '{not-json');
    const service = createE2EInventoryService();

    await expect(service.listInventory(allFilters)).resolves.toBeNull();
    expect(EMPTY_INVENTORY_FIXTURE.items).toHaveLength(0);
  });
});
