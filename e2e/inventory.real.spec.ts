import { expect, test } from '@playwright/test';

const useRealInventoryBackend =
  process.env.PLAYWRIGHT_INVENTORY_REAL_BACKEND === 'true';
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function uniqueTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Inventory live backend contract', () => {
  test.skip(
    !useRealInventoryBackend,
    'Set PLAYWRIGHT_INVENTORY_REAL_BACKEND=true with a configured backend to run live Inventory E2E.',
  );

  test('lists, filters, reconciles, and safely rejects inventory movements', async ({
    page,
  }) => {
    const suffix = uniqueTestSuffix();
    const email = `inventory-e2e-${suffix}@example.test`;
    const password = 'StrongPass1!';
    const productName = `Inventory contract ${suffix}`;
    const sku = `INV-${suffix}`;
    const inventoryRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith(`${backendBaseUrl}/api/v1/inventory/`)) {
        inventoryRequests.push(url);
      }
    });

    await page.goto('/register');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Inventory item setup is deliberately not part of the current Inventory UI
    // scope. It creates only an isolated, authenticated prerequisite record for
    // the live browser contract and does not replace any user-facing workflow.
    const setup = await page.evaluate(
      async ({ apiBaseUrl, setupEmail, setupPassword, setupProductName, setupSku }) => {
        const request = async (
          path: string,
          options: RequestInit,
        ): Promise<{ ok: boolean; status: number; data: unknown }> => {
          const response = await fetch(`${apiBaseUrl}${path}`, options);
          const data: unknown = await response.json();
          return { ok: response.ok, status: response.status, data };
        };

        const login = await request('/api/v1/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: setupEmail, password: setupPassword }),
        });
        if (!login.ok || typeof login.data !== 'object' || login.data === null) {
          return { stage: 'login', status: login.status };
        }

        const loginData = login.data as {
          data?: { tokens?: { access_token?: unknown } };
        };
        const accessToken = loginData.data?.tokens?.access_token;
        if (typeof accessToken !== 'string' || accessToken === '') {
          return { stage: 'login_payload', status: login.status };
        }

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        };
        const product = await request('/api/v1/products', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: setupProductName,
            sku: setupSku,
            unit: 'pcs',
            selling_price: '12.50',
          }),
        });
        if (!product.ok || typeof product.data !== 'object' || product.data === null) {
          return { stage: 'product', status: product.status };
        }

        const productData = product.data as { data?: { product?: { id?: unknown } } };
        const productId = productData.data?.product?.id;
        if (typeof productId !== 'string' || productId === '') {
          return { stage: 'product_payload', status: product.status };
        }

        const inventory = await request('/api/v1/inventory/items', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product_id: productId,
            opening_stock: '2.000',
            minimum_stock: '5.000',
            safety_stock: '1.000',
          }),
        });
        return inventory.ok
          ? { stage: 'complete', status: inventory.status }
          : { stage: 'inventory', status: inventory.status };
      },
      {
        apiBaseUrl: backendBaseUrl,
        setupEmail: email,
        setupPassword: password,
        setupProductName: productName,
        setupSku: sku,
      },
    );
    expect(setup).toEqual({ stage: 'complete', status: 201 });

    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByText(productName)).toBeVisible();
    await expect(
      page.getByRole('row', { name: new RegExp(productName) }),
    ).toContainText('2 pcs');

    await page.getByLabel('Inventory view').selectOption('low_stock');
    await expect(page.getByText(productName)).toBeVisible();

    await page.getByLabel('Inventory view').selectOption('all');
    await page.getByRole('button', { name: `Update stock for ${productName}` }).click();
    let dialog = page.getByRole('dialog', { name: 'Update stock' });
    await dialog.getByLabel(/^Quantity/).fill('5');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('row', { name: new RegExp(productName) }),
    ).toContainText('7 pcs');

    await page.getByLabel('Inventory view').selectOption('low_stock');
    await expect(page.getByText('No low-stock items available.')).toBeVisible();

    await page.getByLabel('Inventory view').selectOption('all');
    await page.getByRole('button', { name: `Update stock for ${productName}` }).click();
    dialog = page.getByRole('dialog', { name: 'Update stock' });
    await dialog.getByLabel(/^Movement type/).selectOption('stock_out');
    await dialog.getByLabel(/^Quantity/).fill('8');
    await dialog.getByRole('button', { name: 'Update stock', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveText(
      'Insufficient stock for this movement.',
    );

    expect(inventoryRequests.some((url) => url.includes('/inventory/items'))).toBe(
      true,
    );
    expect(inventoryRequests.some((url) => url.includes('/inventory/low-stock'))).toBe(
      true,
    );
    expect(
      inventoryRequests.filter((url) => url.includes('/inventory/movements')),
    ).toHaveLength(2);
  });
});
