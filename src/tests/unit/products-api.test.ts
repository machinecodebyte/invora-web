import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PRODUCTS_E2E_STORAGE_KEY,
  ProductServiceError,
  createE2EProductService,
  createHttpProductService,
  createUnavailableProductService,
} from '@/features/products/api';
import { ApiClient } from '@/lib/api-client';
import { PRODUCTS_FIXTURE } from '@/tests/fixtures/products';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Product service boundary', () => {
  it('maps the authenticated Product Catalog list contract and server filters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            products: [
              {
                id: 'product-1',
                category_id: null,
                name: 'Milk',
                sku: 'MILK-1',
                description: null,
                unit: 'liter',
                selling_price: '12.50',
                cost_price: '9.25',
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
    const service = createHttpProductService(
      new ApiClient({
        baseUrl: 'https://api.example.test',
        getAccessToken: () => 'access-token',
        fetchImpl,
      }),
    );

    await expect(
      service.listProducts({ search: ' milk ', status: 'active' }),
    ).resolves.toMatchObject({
      total: 1,
      products: [{ sellingPrice: 12.5, costPrice: 9.25, isActive: true }],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/products?search=milk&is_active=true&limit=200&offset=0&sort_by=created_at&sort_order=desc',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      }),
    );
    const requestHeaders = fetchImpl.mock.calls[0]?.[1].headers as Headers;
    expect(requestHeaders.get('Authorization')).toBe('Bearer access-token');
  });

  it('maps create and update requests to the real backend payloads', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              product: {
                id: 'product-1',
                category_id: null,
                name: 'Milk',
                sku: 'MILK-1',
                description: null,
                unit: 'liter',
                selling_price: '12.50',
                cost_price: null,
                is_active: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              product: {
                id: 'product-1',
                category_id: null,
                name: 'Fresh Milk',
                sku: 'MILK-1',
                description: null,
                unit: 'liter',
                selling_price: '13.00',
                cost_price: null,
                is_active: false,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-02T00:00:00Z',
              },
            },
          }),
          { status: 200 },
        ),
      );
    const service = createHttpProductService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );
    const createInput = {
      name: 'Milk',
      sku: 'MILK-1',
      description: null,
      unit: 'liter' as const,
      sellingPrice: 12.5,
      costPrice: null,
    };

    await service.createProduct(createInput);
    await service.updateProduct('product-1', {
      ...createInput,
      name: 'Fresh Milk',
      sellingPrice: 13,
      isActive: false,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/v1/products',
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1].body))).toEqual({
      name: 'Milk',
      sku: 'MILK-1',
      category_id: null,
      description: null,
      unit: 'liter',
      selling_price: 12.5,
      cost_price: null,
    });
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'https://api.example.test/api/v1/products/product-1',
    );
    expect(fetchImpl.mock.calls[1]?.[1].method).toBe('PATCH');
    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1].body))).toEqual({
      name: 'Fresh Milk',
      sku: 'MILK-1',
      description: null,
      unit: 'liter',
      selling_price: 13,
      cost_price: null,
      is_active: false,
    });
  });

  it('uses the detail, archive, category, and unit endpoint contracts', async () => {
    const product = {
      id: 'product-1',
      category_id: 'category-1',
      name: 'Milk',
      sku: 'MILK-1',
      description: 'Fresh milk',
      unit: 'liter',
      selling_price: '12.50',
      cost_price: '9.25',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    const category = {
      id: 'category-1',
      name: 'Dairy',
      description: 'Chilled products',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    const response = (data: unknown, status = 200) =>
      new Response(JSON.stringify({ success: true, data }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ product }))
      .mockResolvedValueOnce(response({ message: 'Product archived.' }))
      .mockResolvedValueOnce(
        response({ categories: [category], total: 1, limit: 200, offset: 0 }),
      )
      .mockResolvedValueOnce(response({ category }, 201))
      .mockResolvedValueOnce(
        response({ category: { ...category, name: 'Fresh Dairy' } }),
      )
      .mockResolvedValueOnce(response({ message: 'Category archived.' }))
      .mockResolvedValueOnce(response({ units: ['pcs', 'kg', 'liter'] }));
    const service = createHttpProductService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(service.getProduct('product/1')).resolves.toMatchObject({
      categoryId: 'category-1',
      sellingPrice: 12.5,
    });
    await expect(service.archiveProduct('product/1')).resolves.toBeUndefined();
    await expect(service.listCategories()).resolves.toMatchObject({
      total: 1,
      categories: [{ name: 'Dairy' }],
    });
    await expect(
      service.createCategory({ name: 'Dairy', description: 'Chilled products' }),
    ).resolves.toMatchObject({ id: 'category-1' });
    await expect(
      service.updateCategory('category/1', {
        name: 'Fresh Dairy',
        description: null,
        isActive: false,
      }),
    ).resolves.toMatchObject({ name: 'Fresh Dairy' });
    await expect(service.archiveCategory('category/1')).resolves.toBeUndefined();
    await expect(service.listUnits()).resolves.toEqual(['pcs', 'kg', 'liter']);

    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      'https://api.example.test/api/v1/products/product%2F1',
      'https://api.example.test/api/v1/products/product%2F1',
      'https://api.example.test/api/v1/products/categories?limit=200&offset=0&sort_by=created_at&sort_order=desc',
      'https://api.example.test/api/v1/products/categories',
      'https://api.example.test/api/v1/products/categories/category%2F1',
      'https://api.example.test/api/v1/products/categories/category%2F1',
      'https://api.example.test/api/v1/products/units',
    ]);
    expect(fetchImpl.mock.calls.map((call) => call[1].method)).toEqual([
      'GET',
      'DELETE',
      'GET',
      'POST',
      'PATCH',
      'DELETE',
      'GET',
    ]);
    expect(JSON.parse(String(fetchImpl.mock.calls[3]?.[1].body))).toEqual({
      name: 'Dairy',
      description: 'Chilled products',
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[4]?.[1].body))).toEqual({
      name: 'Fresh Dairy',
      description: null,
      is_active: false,
    });
  });

  it('preserves a safe error response for a missing product detail', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'product_not_found', message: 'Product not found.' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const service = createHttpProductService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    await expect(service.getProduct('missing-product')).rejects.toMatchObject({
      status: 404,
      code: 'product_not_found',
      message: 'Product not found.',
    });
  });

  it('returns no data and refuses writes before Product Catalog integration', async () => {
    const service = createUnavailableProductService();

    await expect(
      service.listProducts({ search: '', status: 'all' }),
    ).resolves.toBeNull();
    await expect(
      service.createProduct({
        name: 'Product',
        sku: 'PRODUCT-1',
        description: null,
        unit: 'pcs',
        sellingPrice: 0,
        costPrice: null,
      }),
    ).rejects.toEqual(
      new ProductServiceError(
        'products_unavailable',
        'Product creation is not available yet.',
      ),
    );
  });

  it('reads and filters only Playwright-provided product fixtures', async () => {
    window.sessionStorage.setItem(
      PRODUCTS_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'ready', data: PRODUCTS_FIXTURE }),
    );

    await expect(
      createE2EProductService().listProducts({ search: 'cable', status: 'active' }),
    ).resolves.toMatchObject({
      total: 1,
      products: [{ sku: 'WGT-CBL-01' }],
    });
  });

  it('isolates deterministic E2E creates and updates in session-scoped state', async () => {
    window.sessionStorage.setItem(
      PRODUCTS_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'ready', data: PRODUCTS_FIXTURE }),
    );
    const service = createE2EProductService();
    const created = await service.createProduct({
      name: 'Widget Case',
      sku: 'WGT-CASE-01',
      description: null,
      unit: 'box',
      sellingPrice: 10,
      costPrice: 4,
    });
    const updated = await service.updateProduct(created.id, {
      name: created.name,
      sku: created.sku,
      description: created.description,
      unit: created.unit,
      sellingPrice: created.sellingPrice,
      costPrice: created.costPrice,
      isActive: false,
    });

    expect(updated.isActive).toBe(false);
    await expect(
      service.listProducts({ search: 'case', status: 'inactive' }),
    ).resolves.toMatchObject({
      total: 1,
      products: [{ name: 'Widget Case', isActive: false }],
    });
  });

  it('normalizes malformed or failed E2E fixture state safely', async () => {
    window.sessionStorage.setItem(PRODUCTS_E2E_STORAGE_KEY, '{not-json');
    await expect(
      createE2EProductService().listProducts({ search: '', status: 'all' }),
    ).resolves.toBeNull();

    window.sessionStorage.setItem(
      PRODUCTS_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'error' }),
    );
    await expect(
      createE2EProductService().listProducts({ search: '', status: 'all' }),
    ).rejects.toEqual(
      new ProductServiceError('products_unavailable', 'Unable to load products.'),
    );
  });
});
