import type {
  Product,
  ProductCreateData,
  ProductListFilters,
  ProductListResult,
  ProductUnit,
  ProductUpdateData,
} from '@/features/products/types';
import { PRODUCT_UNITS } from '@/features/products/types';

export type ProductServiceErrorCode = 'products_unavailable' | 'product_not_found';

/** Safe Product Catalog error for presentation and test boundaries. */
export class ProductServiceError extends Error {
  constructor(
    public readonly code: ProductServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProductServiceError';
  }
}

/**
 * Future Product Catalog integration implements this contract.
 *
 * It remains independent from React and transport details so a future HTTP
 * adapter can normalize backend payloads without changing components or tests.
 */
export interface ProductService {
  listProducts(filters: ProductListFilters): Promise<ProductListResult | null>;
  createProduct(input: ProductCreateData): Promise<Product>;
  updateProduct(productId: string, input: ProductUpdateData): Promise<Product>;
}

/**
 * Production placeholder before Product Catalog API integration.
 *
 * This deliberately makes no network request and never reports a local write
 * as persistent server data.
 */
export function createUnavailableProductService(): ProductService {
  return {
    listProducts: () => Promise.resolve(null),
    createProduct: () =>
      Promise.reject(
        new ProductServiceError(
          'products_unavailable',
          'Product creation is not available yet.',
        ),
      ),
    updateProduct: () =>
      Promise.reject(
        new ProductServiceError(
          'products_unavailable',
          'Product updates are not available yet.',
        ),
      ),
  };
}

/** Storage key read only by the Playwright-only Product service below. */
export const PRODUCTS_E2E_STORAGE_KEY = 'invora-e2e-products-fixture';

type ProductsE2EFixture =
  | { readonly state: 'ready'; readonly data: ProductListResult }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProductUnit(value: unknown): value is ProductUnit {
  return typeof value === 'string' && PRODUCT_UNITS.includes(value as ProductUnit);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.categoryId === null || typeof value.categoryId === 'string') &&
    typeof value.name === 'string' &&
    typeof value.sku === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    isProductUnit(value.unit) &&
    isFiniteNumber(value.sellingPrice) &&
    (value.costPrice === null || isFiniteNumber(value.costPrice)) &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isProductListResult(value: unknown): value is ProductListResult {
  return (
    isRecord(value) &&
    Array.isArray(value.products) &&
    value.products.every(isProduct) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.limit) &&
    isFiniteNumber(value.offset)
  );
}

function readE2EFixture(): ProductsE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'empty' };
  }

  const encodedFixture = window.sessionStorage.getItem(PRODUCTS_E2E_STORAGE_KEY);
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
    if (value.state === 'ready' && isProductListResult(value.data)) {
      return { state: 'ready', data: value.data };
    }
  } catch {
    // A malformed E2E fixture never crashes the application.
  }

  return { state: 'empty' };
}

function writeE2EFixture(fixture: ProductsE2EFixture): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PRODUCTS_E2E_STORAGE_KEY, JSON.stringify(fixture));
  }
}

function applyFilters(
  data: ProductListResult,
  filters: ProductListFilters,
): ProductListResult {
  const query = filters.search.trim().toLocaleLowerCase();
  const products = data.products.filter((product) => {
    const matchesSearch =
      query === '' ||
      product.name.toLocaleLowerCase().includes(query) ||
      product.sku.toLocaleLowerCase().includes(query);
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'active' && product.isActive) ||
      (filters.status === 'inactive' && !product.isActive);
    return matchesSearch && matchesStatus;
  });

  return { ...data, products, total: products.length };
}

function e2EDataForWrite(fixture: ProductsE2EFixture): ProductListResult {
  if (fixture.state === 'ready') {
    return fixture.data;
  }
  if (fixture.state === 'empty') {
    return { products: [], total: 0, limit: 200, offset: 0 };
  }
  throw new ProductServiceError(
    'products_unavailable',
    'Product changes are not available right now.',
  );
}

/**
 * Deterministic adapter selected only for the Playwright-managed build.
 *
 * Its session-scoped fixture is supplied by E2E setup. It has no hard-coded
 * production product data and is never selected by a normal application build.
 */
export function createE2EProductService(): ProductService {
  return {
    listProducts: (filters) => {
      const fixture = readE2EFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new ProductServiceError('products_unavailable', 'Unable to load products.'),
        );
      }
      return Promise.resolve(
        fixture.state === 'ready' ? applyFilters(fixture.data, filters) : null,
      );
    },
    createProduct: (input) => {
      try {
        const data = e2EDataForWrite(readE2EFixture());
        const now = new Date().toISOString();
        const product: Product = {
          id: 'e2e-product-' + Date.now(),
          categoryId: null,
          ...input,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        writeE2EFixture({
          state: 'ready',
          data: {
            ...data,
            products: [product, ...data.products],
            total: data.total + 1,
          },
        });
        return Promise.resolve(product);
      } catch (error: unknown) {
        return Promise.reject(error);
      }
    },
    updateProduct: (productId, input) => {
      try {
        const data = e2EDataForWrite(readE2EFixture());
        const currentProduct = data.products.find(
          (product) => product.id === productId,
        );
        if (currentProduct === undefined) {
          return Promise.reject(
            new ProductServiceError(
              'product_not_found',
              'Unable to update the product.',
            ),
          );
        }

        const product: Product = {
          ...currentProduct,
          ...input,
          updatedAt: new Date().toISOString(),
        };
        writeE2EFixture({
          state: 'ready',
          data: {
            ...data,
            products: data.products.map((item) =>
              item.id === productId ? product : item,
            ),
          },
        });
        return Promise.resolve(product);
      } catch (error: unknown) {
        return Promise.reject(error);
      }
    },
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_PRODUCTS_E2E_TEST_MODE === 'true';

/** The sole Product Catalog service selected for the current build. */
export const productService: ProductService = isE2ETestMode
  ? createE2EProductService()
  : createUnavailableProductService();
