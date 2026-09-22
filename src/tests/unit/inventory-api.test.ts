import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  INVENTORY_E2E_STORAGE_KEY,
  InventoryServiceError,
  createE2EInventoryService,
  createHttpInventoryService,
  createUnavailableInventoryService,
} from '@/features/inventory/api';
import { ApiClient } from '@/lib/api-client';
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
  it('keeps the unavailable seam isolated without performing a write', async () => {
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

  it('maps the authenticated Inventory list contract, filters, decimals, and pagination', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'inventory-1',
                product_id: 'product-1',
                product: {
                  id: 'product-1',
                  name: 'Milk',
                  sku: 'MILK-1',
                  category_id: null,
                  unit: 'liter',
                  is_active: true,
                },
                current_stock: '12.500',
                minimum_stock: '5.000',
                safety_stock: '2.000',
                stock_status: 'in_stock',
                is_active: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-02T00:00:00Z',
              },
            ],
            total: 1,
            limit: 200,
            offset: 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const service = createHttpInventoryService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        getAccessToken: () => 'access-token',
        fetchImpl,
      }),
    );

    await expect(
      service.listInventory({ search: ' milk ', status: 'in_stock', view: 'all' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          productId: 'product-1',
          currentStock: 12.5,
          minimumStock: 5,
          safetyStock: 2,
          stockStatus: 'in_stock',
        },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/inventory/items?search=milk&stock_status=in_stock&limit=200&offset=0&sort_by=updated_at&sort_order=desc',
      expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }),
    );
    const headers = fetchImpl.mock.calls[0]?.[1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('uses the dedicated low-stock endpoint and does not recreate threshold evaluation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'inventory-low',
                product_id: 'product-low',
                product: {
                  id: 'product-low',
                  name: 'Low Milk',
                  sku: 'LOW-1',
                  category_id: null,
                  unit: 'liter',
                  is_active: true,
                },
                current_stock: '3.000',
                minimum_stock: '5.000',
                safety_stock: '2.000',
                stock_status: 'low_stock',
                is_active: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-02T00:00:00Z',
              },
            ],
            total: 1,
            limit: 200,
            offset: 0,
          },
        }),
        { status: 200 },
      ),
    );
    const service = createHttpInventoryService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(
      service.listLowStock({ search: 'milk', status: 'low_stock', view: 'low_stock' }),
    ).resolves.toMatchObject({ total: 1, items: [{ productId: 'product-low' }] });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/inventory/low-stock?limit=200&offset=0',
    );
  });

  it('maps the immutable movement response and preserves decimal input text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            movement: {
              product_id: 'product-1',
              quantity_after: '7.500',
            },
          },
        }),
        { status: 201 },
      ),
    );
    const service = createHttpInventoryService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(
      service.createStockMovement({
        productId: 'product-1',
        movementType: 'correction',
        quantity: '-1.250',
        reason: 'Count correction',
      }),
    ).resolves.toEqual({ productId: 'product-1', quantityAfter: 7.5 });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/inventory/movements',
    );
    expect(fetchImpl.mock.calls[0]?.[1].method).toBe('POST');
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1].body))).toEqual({
      product_id: 'product-1',
      movement_type: 'correction',
      quantity: '-1.250',
      reason: 'Count correction',
    });
  });

  it('normalizes insufficient stock to a safe feature error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'insufficient_stock',
            message: 'Insufficient stock for this movement.',
          },
        }),
        { status: 409 },
      ),
    );
    const service = createHttpInventoryService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(
      service.createStockMovement({
        productId: 'product-1',
        movementType: 'stock_out',
        quantity: '2',
        reason: null,
      }),
    ).rejects.toEqual(
      new InventoryServiceError(
        'insufficient_stock',
        'Insufficient stock for this movement.',
      ),
    );
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
