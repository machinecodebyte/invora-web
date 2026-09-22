import type {
  Product,
  ProductCategory,
  ProductCategoryData,
  ProductCategoryListResult,
  ProductCreateData,
  ProductListFilters,
  ProductListResult,
  ProductUnit,
  ProductUpdateData,
} from '@/features/products/types';
import { PRODUCT_UNITS } from '@/features/products/types';
import { apiClient, type ApiClient } from '@/lib/api-client';

export type ProductServiceErrorCode =
  'products_unavailable' | 'product_not_found' | 'category_not_found';

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
  getProduct(productId: string): Promise<Product>;
  archiveProduct(productId: string): Promise<void>;
  listCategories(): Promise<ProductCategoryListResult>;
  createCategory(input: ProductCategoryData): Promise<ProductCategory>;
  updateCategory(
    categoryId: string,
    input: ProductCategoryData,
  ): Promise<ProductCategory>;
  archiveCategory(categoryId: string): Promise<void>;
  listUnits(): Promise<readonly ProductUnit[]>;
}

type ProductWire = {
  readonly id: string;
  readonly category_id: string | null;
  readonly name: string;
  readonly sku: string;
  readonly description: string | null;
  readonly unit: string;
  readonly selling_price: number | string;
  readonly cost_price: number | string | null;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
};

function invalidProductResponse(): ProductServiceError {
  return new ProductServiceError(
    'products_unavailable',
    'The server returned an unexpected product response.',
  );
}

function isProductWire(value: unknown): value is ProductWire {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    (value.category_id === null || typeof value.category_id === 'string') &&
    typeof value.name === 'string' &&
    typeof value.sku === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.unit === 'string' &&
    (typeof value.selling_price === 'number' ||
      typeof value.selling_price === 'string') &&
    (value.cost_price === null ||
      typeof value.cost_price === 'number' ||
      typeof value.cost_price === 'string') &&
    typeof value.is_active === 'boolean' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

function mapPrice(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw invalidProductResponse();
  }
  return parsed;
}

export function mapProductResponse(value: unknown): Product {
  if (!isProductWire(value) || !isProductUnit(value.unit)) {
    throw invalidProductResponse();
  }
  return {
    id: value.id,
    categoryId: value.category_id,
    name: value.name,
    sku: value.sku,
    description: value.description,
    unit: value.unit,
    sellingPrice: mapPrice(value.selling_price),
    costPrice: value.cost_price === null ? null : mapPrice(value.cost_price),
    isActive: value.is_active,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapProductListResponse(value: unknown): ProductListResult {
  if (!isRecord(value) || !Array.isArray(value.products)) {
    throw invalidProductResponse();
  }
  if (
    !isFiniteNumber(value.total) ||
    !isFiniteNumber(value.limit) ||
    !isFiniteNumber(value.offset)
  ) {
    throw invalidProductResponse();
  }
  return {
    products: value.products.map(mapProductResponse),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

function toCreateRequest(input: ProductCreateData): Record<string, unknown> {
  return {
    name: input.name,
    sku: input.sku,
    category_id: input.categoryId ?? null,
    description: input.description,
    unit: input.unit,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
  };
}

function toUpdateRequest(input: ProductUpdateData): Record<string, unknown> {
  return {
    name: input.name,
    sku: input.sku,
    description: input.description,
    unit: input.unit,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
    is_active: input.isActive,
    ...(input.categoryId === undefined ? {} : { category_id: input.categoryId }),
  };
}

function mapCategoryResponse(value: unknown): ProductCategory {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    (value.description !== null && typeof value.description !== 'string') ||
    typeof value.is_active !== 'boolean' ||
    typeof value.created_at !== 'string' ||
    typeof value.updated_at !== 'string'
  ) {
    throw invalidProductResponse();
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    isActive: value.is_active,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

/** Real FastAPI Product Catalog adapter for normal application builds. */
export function createHttpProductService(
  client: ApiClient = apiClient,
): ProductService {
  return {
    async listProducts(filters) {
      const data = await client.get<unknown>('/api/v1/products', {
        query: {
          search: filters.search.trim() || null,
          is_active: filters.status === 'all' ? null : filters.status === 'active',
          limit: 200,
          offset: 0,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      });
      return mapProductListResponse(data);
    },
    async createProduct(input) {
      const data = await client.post<unknown>(
        '/api/v1/products',
        toCreateRequest(input),
      );
      if (!isRecord(data)) {
        throw invalidProductResponse();
      }
      return mapProductResponse(data.product);
    },
    async updateProduct(productId, input) {
      const data = await client.patch<unknown>(
        `/api/v1/products/${encodeURIComponent(productId)}`,
        toUpdateRequest(input),
      );
      if (!isRecord(data)) {
        throw invalidProductResponse();
      }
      return mapProductResponse(data.product);
    },
    async getProduct(productId) {
      const data = await client.get<unknown>(
        `/api/v1/products/${encodeURIComponent(productId)}`,
      );
      if (!isRecord(data)) throw invalidProductResponse();
      return mapProductResponse(data.product);
    },
    async archiveProduct(productId) {
      await client.delete(`/api/v1/products/${encodeURIComponent(productId)}`);
    },
    async listCategories() {
      const data = await client.get<unknown>('/api/v1/products/categories', {
        query: { limit: 200, offset: 0, sort_by: 'created_at', sort_order: 'desc' },
      });
      if (
        !isRecord(data) ||
        !Array.isArray(data.categories) ||
        !isFiniteNumber(data.total) ||
        !isFiniteNumber(data.limit) ||
        !isFiniteNumber(data.offset)
      )
        throw invalidProductResponse();
      return {
        categories: data.categories.map(mapCategoryResponse),
        total: data.total,
        limit: data.limit,
        offset: data.offset,
      };
    },
    async createCategory(input) {
      const data = await client.post<unknown>('/api/v1/products/categories', {
        name: input.name,
        description: input.description,
      });
      if (!isRecord(data)) throw invalidProductResponse();
      return mapCategoryResponse(data.category);
    },
    async updateCategory(categoryId, input) {
      const data = await client.patch<unknown>(
        `/api/v1/products/categories/${encodeURIComponent(categoryId)}`,
        {
          name: input.name,
          description: input.description,
          ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
        },
      );
      if (!isRecord(data)) throw invalidProductResponse();
      return mapCategoryResponse(data.category);
    },
    async archiveCategory(categoryId) {
      await client.delete(
        `/api/v1/products/categories/${encodeURIComponent(categoryId)}`,
      );
    },
    async listUnits() {
      const data = await client.get<unknown>('/api/v1/products/units');
      if (
        !isRecord(data) ||
        !Array.isArray(data.units) ||
        !data.units.every(isProductUnit)
      )
        throw invalidProductResponse();
      return data.units;
    },
  };
}

/**
 * Production placeholder before Product Catalog API integration.
 *
 * This deliberately makes no network request and never reports a local write
 * as persistent server data.
 */
export function createUnavailableProductService(): ProductService {
  const unavailable = (): Promise<never> =>
    Promise.reject(
      new ProductServiceError(
        'products_unavailable',
        'Product Catalog is not available yet.',
      ),
    );
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
    getProduct: unavailable,
    archiveProduct: unavailable,
    listCategories: unavailable,
    createCategory: unavailable,
    updateCategory: unavailable,
    archiveCategory: unavailable,
    listUnits: unavailable,
  };
}

/** Storage key read only by the Playwright-only Product service below. */
export const PRODUCTS_E2E_STORAGE_KEY = 'invora-e2e-products-fixture';
/** Storage key read only by the Playwright-only category service below. */
export const PRODUCT_CATEGORIES_E2E_STORAGE_KEY =
  'invora-e2e-product-categories-fixture';

type ProductsE2EFixture =
  | { readonly state: 'ready'; readonly data: ProductListResult }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

type ProductCategoriesE2EFixture =
  | { readonly state: 'ready'; readonly data: ProductCategoryListResult }
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

function isProductCategory(value: unknown): value is ProductCategory {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isProductCategoryListResult(
  value: unknown,
): value is ProductCategoryListResult {
  return (
    isRecord(value) &&
    Array.isArray(value.categories) &&
    value.categories.every(isProductCategory) &&
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

function emptyCategoryList(): ProductCategoryListResult {
  return { categories: [], total: 0, limit: 200, offset: 0 };
}

function readE2ECategoryFixture(): ProductCategoriesE2EFixture {
  if (typeof window === 'undefined') {
    return { state: 'empty' };
  }

  const encodedFixture = window.sessionStorage.getItem(
    PRODUCT_CATEGORIES_E2E_STORAGE_KEY,
  );
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
    if (value.state === 'ready' && isProductCategoryListResult(value.data)) {
      return { state: 'ready', data: value.data };
    }
  } catch {
    // A malformed E2E fixture never crashes the application.
  }

  return { state: 'empty' };
}

function writeE2ECategoryFixture(fixture: ProductCategoriesE2EFixture): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      PRODUCT_CATEGORIES_E2E_STORAGE_KEY,
      JSON.stringify(fixture),
    );
  }
}

function e2ECategoryDataForWrite(
  fixture: ProductCategoriesE2EFixture,
): ProductCategoryListResult {
  if (fixture.state === 'ready') {
    return fixture.data;
  }
  if (fixture.state === 'empty') {
    return emptyCategoryList();
  }
  throw new ProductServiceError(
    'products_unavailable',
    'Category changes are not available right now.',
  );
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

function archiveE2EProduct(productId: string): Promise<void> {
  try {
    const data = e2EDataForWrite(readE2EFixture());
    if (!data.products.some((product) => product.id === productId)) {
      return Promise.reject(
        new ProductServiceError('product_not_found', 'Product not found.'),
      );
    }
    writeE2EFixture({
      state: 'ready',
      data: {
        ...data,
        products: data.products.map((product) =>
          product.id === productId
            ? { ...product, isActive: false, updatedAt: new Date().toISOString() }
            : product,
        ),
      },
    });
    return Promise.resolve();
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}

function createE2ECategory(input: ProductCategoryData): Promise<ProductCategory> {
  try {
    const data = e2ECategoryDataForWrite(readE2ECategoryFixture());
    const now = new Date().toISOString();
    const category: ProductCategory = {
      id: 'e2e-category-' + Date.now(),
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    writeE2ECategoryFixture({
      state: 'ready',
      data: {
        ...data,
        categories: [category, ...data.categories],
        total: data.total + 1,
      },
    });
    return Promise.resolve(category);
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}

function updateE2ECategory(
  categoryId: string,
  input: ProductCategoryData,
): Promise<ProductCategory> {
  try {
    const data = e2ECategoryDataForWrite(readE2ECategoryFixture());
    const current = data.categories.find((category) => category.id === categoryId);
    if (current === undefined) {
      return Promise.reject(
        new ProductServiceError('category_not_found', 'Category not found.'),
      );
    }
    const category: ProductCategory = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    writeE2ECategoryFixture({
      state: 'ready',
      data: {
        ...data,
        categories: data.categories.map((item) =>
          item.id === categoryId ? category : item,
        ),
      },
    });
    return Promise.resolve(category);
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}

function archiveE2ECategory(categoryId: string): Promise<void> {
  try {
    const data = e2ECategoryDataForWrite(readE2ECategoryFixture());
    if (!data.categories.some((category) => category.id === categoryId)) {
      return Promise.reject(
        new ProductServiceError('category_not_found', 'Category not found.'),
      );
    }
    writeE2ECategoryFixture({
      state: 'ready',
      data: {
        ...data,
        categories: data.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                isActive: false,
                updatedAt: new Date().toISOString(),
              }
            : category,
        ),
      },
    });
    return Promise.resolve();
  } catch (error: unknown) {
    return Promise.reject(error);
  }
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
    getProduct: (productId) => {
      try {
        const product = e2EDataForWrite(readE2EFixture()).products.find(
          (item) => item.id === productId,
        );
        return product === undefined
          ? Promise.reject(
              new ProductServiceError('product_not_found', 'Product not found.'),
            )
          : Promise.resolve(product);
      } catch (error: unknown) {
        return Promise.reject(error);
      }
    },
    archiveProduct: archiveE2EProduct,
    listCategories: () => {
      const fixture = readE2ECategoryFixture();
      if (fixture.state === 'error') {
        return Promise.reject(
          new ProductServiceError('products_unavailable', 'Unable to load categories.'),
        );
      }
      return Promise.resolve(
        fixture.state === 'ready' ? fixture.data : emptyCategoryList(),
      );
    },
    createCategory: createE2ECategory,
    updateCategory: updateE2ECategory,
    archiveCategory: archiveE2ECategory,
    listUnits: () => Promise.resolve(PRODUCT_UNITS),
  };
}

const isE2ETestMode = process.env.NEXT_PUBLIC_PRODUCTS_E2E_TEST_MODE === 'true';

/** The sole Product Catalog service selected for the current build. */
export const productService: ProductService = isE2ETestMode
  ? createE2EProductService()
  : createHttpProductService();
