import { expect, test, type Page } from '@playwright/test';

import {
  PRODUCT_CATEGORIES_E2E_STORAGE_KEY,
  PRODUCTS_E2E_STORAGE_KEY,
} from '../src/features/products/api';
import {
  EMPTY_PRODUCTS_FIXTURE,
  PRODUCTS_FIXTURE,
} from '../src/tests/fixtures/products';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';

type ProductsE2EFixture =
  | { readonly state: 'ready'; readonly data: typeof PRODUCTS_FIXTURE }
  | { readonly state: 'ready'; readonly data: typeof EMPTY_PRODUCTS_FIXTURE }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

const CATEGORIES_FIXTURE = {
  categories: [
    {
      id: 'category-cables-1',
      name: 'Cables',
      description: 'Connectivity products',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  total: 1,
  limit: 200,
  offset: 0,
} as const;

type CategoriesE2EFixture =
  | { readonly state: 'ready'; readonly data: typeof CATEGORIES_FIXTURE }
  | { readonly state: 'empty' }
  | { readonly state: 'error' };

async function setProductsFixture(
  page: Page,
  fixture: ProductsE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: PRODUCTS_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function setCategoriesFixture(
  page: Page,
  fixture: CategoriesE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: PRODUCT_CATEGORIES_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(page: Page, fixture: ProductsE2EFixture): Promise<void> {
  await setProductsFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(TEST_EMAIL);
  await page.getByLabel(/^Password/).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/products');
  await expect(page).toHaveURL('/products');
}

test.describe('Products', () => {
  test('redirects unauthenticated visitors before Product Catalog content is exposed', async ({
    page,
  }) => {
    await page.goto('/products');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fproducts$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Products' })).not.toBeVisible();
  });

  test('renders an authenticated product list with readable table semantics', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await expect(
      page.getByRole('heading', { level: 1, name: 'Products' }),
    ).toBeVisible();
    await expect(page.getByRole('table', { name: 'Products' })).toBeVisible();
    await expect(page.getByText('Widget Cable')).toBeVisible();
    await expect(page.getByText('WGT-CBL-01')).toBeVisible();
    await expect(
      page
        .getByRole('row', { name: /Widget Cable/ })
        .getByText('Active', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit Widget Cable' })).toBeVisible();
  });

  test('searches by Product Catalog fields and filters by backend-aligned status', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await page.getByLabel('Search products').fill('powder');
    await expect(page.getByText('Widget Powder')).toBeVisible();
    await expect(page.getByText('Widget Cable')).not.toBeVisible();

    await page.getByLabel('Search products').fill('');
    await page.getByLabel('Status').selectOption('inactive');
    await expect(page.getByText('Widget Powder')).toBeVisible();
    await expect(page.getByText('Widget Cable')).not.toBeVisible();
  });

  test('validates and creates a Product through the deterministic test-only adapter', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await page.getByRole('button', { name: 'Add product' }).click();
    await expect(page.getByRole('dialog', { name: 'Add product' })).toBeVisible();
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page.getByText('Product name is required.')).toBeVisible();

    await page.getByLabel('Name').fill('Widget Case');
    await page.getByLabel('SKU').fill('wgt case 01');
    await page.getByLabel('Unit').selectOption('box');
    await page.getByLabel('Selling price').fill('10.50');
    await page.getByRole('button', { name: 'Create product' }).click();

    await expect(page.getByRole('dialog', { name: 'Add product' })).not.toBeVisible();
    await expect(page.getByText('Widget Case')).toBeVisible();
    await expect(page.getByText('WGT-CASE-01')).toBeVisible();
  });

  test('edits a Product and updates its backend-aligned active status', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await page.getByRole('button', { name: 'Edit Widget Cable' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit product' })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Edit product' })
      .getByLabel('Status')
      .selectOption('inactive');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByRole('dialog', { name: 'Edit product' })).not.toBeVisible();
    const cableRow = page.getByRole('row', { name: /Widget Cable/ });
    await expect(cableRow).toContainText('Inactive');
  });

  test('shows Product details and archives a Product through the deterministic adapter', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await page.getByRole('button', { name: 'View Widget Cable' }).click();
    await expect(page.getByRole('dialog', { name: 'Product details' })).toContainText(
      'WGT-CBL-01',
    );
    await page.getByRole('button', { name: 'Close Product details' }).click();

    await page.getByRole('button', { name: 'Archive Widget Cable' }).click();
    await expect(page.getByRole('dialog', { name: 'Archive product' })).toBeVisible();
    await page.getByRole('button', { name: 'Archive product', exact: true }).click();
    await expect(page.getByRole('row', { name: /Widget Cable/ })).toContainText(
      'Inactive',
    );
  });

  test('manages categories through the deterministic adapter', async ({ page }) => {
    await setCategoriesFixture(page, { state: 'ready', data: CATEGORIES_FIXTURE });
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await page.getByRole('button', { name: 'Manage categories' }).click();
    await expect(page.getByRole('dialog', { name: 'Manage categories' })).toContainText(
      'Cables',
    );
    await page.getByLabel('Category name').fill('Dairy');
    await page.getByRole('button', { name: 'Create category' }).click();
    await expect(page.getByText('Dairy')).toBeVisible();

    await page.getByRole('button', { name: 'Edit Cables' }).click();
    await page.getByLabel('Category name').fill('Cables supplies');
    await page.getByRole('button', { name: 'Save category' }).click();
    await expect(page.getByText('Cables supplies')).toBeVisible();

    await page.getByRole('button', { name: 'Archive Cables supplies' }).click();
    await expect(page.getByLabel('Archive category confirmation')).toBeVisible();
    await page.getByRole('button', { name: 'Archive category' }).click();
    await expect(page.getByText('Cables supplies (Archived)')).toBeVisible();
  });

  test('renders honest empty and safe error Product Catalog states', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: EMPTY_PRODUCTS_FIXTURE });
    await expect(page.getByText('No products available.')).toBeVisible();

    await setProductsFixture(page, { state: 'error' });
    await page.reload();
    await expect(
      page.getByText('Unable to load products.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('ProductServiceError');
  });

  test('remains usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signIn(page, { state: 'ready', data: PRODUCTS_FIXTURE });

    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
