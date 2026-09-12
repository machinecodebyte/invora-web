import { afterEach, describe, expect, it } from 'vitest';

import {
  PRODUCTS_E2E_STORAGE_KEY,
  ProductServiceError,
  createE2EProductService,
  createUnavailableProductService,
} from '@/features/products/api';
import { PRODUCTS_FIXTURE } from '@/tests/fixtures/products';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Product service boundary', () => {
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
