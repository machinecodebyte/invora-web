import { expect, test, type Page } from '@playwright/test';

import {
  INVENTORY_E2E_STORAGE_KEY,
  type InventoryE2EFixture,
} from '../src/features/inventory/api';
import {
  EMPTY_INVENTORY_FIXTURE,
  INVENTORY_FIXTURE,
  LOW_STOCK_INVENTORY_FIXTURE,
  NO_LOW_STOCK_INVENTORY_FIXTURE,
} from '../src/tests/fixtures/inventory';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';

async function setInventoryFixture(
  page: Page,
  fixture: InventoryE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: INVENTORY_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(page: Page, fixture: InventoryE2EFixture): Promise<void> {
  await setInventoryFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(TEST_EMAIL);
  await page.getByLabel(/^Password/).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/inventory');
  await expect(page).toHaveURL('/inventory');
}

const readyFixture: InventoryE2EFixture = {
  state: 'ready',
  data: INVENTORY_FIXTURE,
  lowStockData: LOW_STOCK_INVENTORY_FIXTURE,
};

test.describe('Inventory', () => {
  test('redirects unauthenticated visitors before Inventory content is exposed', async ({
    page,
  }) => {
    await page.goto('/inventory');

    await expect(page).toHaveURL(/\/login\?redirect=%2Finventory$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inventory' })).not.toBeVisible();
  });

  test('renders an authenticated inventory list with semantic table fields', async ({
    page,
  }) => {
    await signIn(page, readyFixture);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Inventory' }),
    ).toBeVisible();
    await expect(page.getByRole('table', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByText('Widget Cable')).toBeVisible();
    await expect(page.getByText('WGT-CBL-01')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Update stock for Widget Cable' }),
    ).toBeVisible();
  });

  test('renders zero stock as an out-of-stock Inventory state', async ({ page }) => {
    await signIn(page, readyFixture);

    const zeroRow = page.getByRole('row', { name: /Widget Zero/ });
    await expect(zeroRow).toContainText('0 pcs');
    await expect(zeroRow).toContainText('Out of stock');
  });

  test('uses the dedicated low-stock projection, including zero-stock items', async ({
    page,
  }) => {
    await signIn(page, readyFixture);
    await page.getByLabel('Inventory view').selectOption('low_stock');

    await expect(page.getByText('Widget Powder')).toBeVisible();
    await expect(page.getByText('Widget Zero')).toBeVisible();
    await expect(page.getByText('Widget Cable')).not.toBeVisible();
  });

  test('renders a successful no-low-stock state', async ({ page }) => {
    await signIn(page, {
      state: 'ready',
      data: NO_LOW_STOCK_INVENTORY_FIXTURE,
      lowStockData: EMPTY_INVENTORY_FIXTURE,
    });
    await page.getByLabel('Inventory view').selectOption('low_stock');

    await expect(page.getByText('No low-stock items available.')).toBeVisible();
  });

  test('records a backend-aligned stock-in movement through the test-only adapter', async ({
    page,
  }) => {
    await signIn(page, readyFixture);
    await page.getByRole('button', { name: 'Update stock for Widget Cable' }).click();
    const dialog = page.getByRole('dialog', { name: 'Update stock' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^Quantity/).fill('3');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();

    await expect(page.getByRole('dialog', { name: 'Update stock' })).not.toBeVisible();
    await expect(page.getByRole('row', { name: /Widget Cable/ })).toContainText(
      '27 pcs',
    );
  });

  test('validates stock movement zero, negative, and correction semantics', async ({
    page,
  }) => {
    await signIn(page, readyFixture);
    await page.getByRole('button', { name: 'Update stock for Widget Cable' }).click();
    const dialog = page.getByRole('dialog', { name: 'Update stock' });
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();
    await expect(page.getByText('Quantity is required.')).toBeVisible();

    await dialog.getByLabel(/^Quantity/).fill('-1');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();
    await expect(page.getByText('Quantity must be greater than zero.')).toBeVisible();

    await dialog.getByLabel(/^Movement type/).selectOption('adjustment');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();
    await expect(page.getByText('Stock level cannot be negative.')).toBeVisible();

    await dialog.getByLabel(/^Movement type/).selectOption('correction');
    await dialog.getByLabel(/^Quantity/).fill('0');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();
    await expect(page.getByText('Correction quantity cannot be zero.')).toBeVisible();
  });

  test('shows a safe stock update failure when a movement would go below zero', async ({
    page,
  }) => {
    await signIn(page, readyFixture);
    await page.getByRole('button', { name: 'Update stock for Widget Cable' }).click();
    const dialog = page.getByRole('dialog', { name: 'Update stock' });
    await dialog.getByLabel(/^Movement type/).selectOption('stock_out');
    await dialog.getByLabel(/^Quantity/).fill('25');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();

    await expect(dialog.getByRole('alert')).toHaveText(
      'Stock cannot be reduced below zero.',
    );
    await expect(page.locator('body')).not.toContainText('InventoryServiceError');
  });

  test('searches inventory and filters by backend stock status', async ({ page }) => {
    await signIn(page, readyFixture);
    await page.getByLabel('Search inventory').fill('powder');
    await expect(page.getByText('Widget Powder')).toBeVisible();
    await expect(page.getByText('Widget Cable')).not.toBeVisible();

    await page.getByLabel('Search inventory').fill('');
    await page.getByLabel('Stock status').selectOption('out_of_stock');
    await expect(page.getByText('Widget Zero')).toBeVisible();
    await expect(page.getByText('Widget Powder')).not.toBeVisible();
  });

  test('renders a successful empty inventory state', async ({ page }) => {
    await signIn(page, {
      state: 'ready',
      data: EMPTY_INVENTORY_FIXTURE,
      lowStockData: EMPTY_INVENTORY_FIXTURE,
    });

    await expect(page.getByText('No inventory records available.')).toBeVisible();
  });

  test('renders a safe Inventory service error state', async ({ page }) => {
    await signIn(page, { state: 'error' });

    await expect(
      page.getByText('Unable to load inventory.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('InventoryServiceError');
  });

  test('remains usable without document-level overflow on a mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signIn(page, readyFixture);

    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
