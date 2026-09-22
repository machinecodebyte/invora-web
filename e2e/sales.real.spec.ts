import { expect, test } from '@playwright/test';

const useRealSalesBackend = process.env.PLAYWRIGHT_SALES_REAL_BACKEND === 'true';
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function uniqueTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Sales live backend contract', () => {
  test.skip(
    !useRealSalesBackend,
    'Set PLAYWRIGHT_SALES_REAL_BACKEND=true with a controlled backend to run live Sales E2E.',
  );

  test('uploads historical demand and reconciles it through the real history and trends endpoints', async ({
    page,
  }) => {
    const suffix = uniqueTestSuffix();
    const email = `sales-e2e-${suffix}@example.test`;
    const password = 'StrongPass1!';
    const productName = `Sales contract ${suffix}`;
    const sku = `SALE-${suffix}`;
    const salesRequests: string[] = [];
    const inventoryRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith(`${backendBaseUrl}/api/v1/sales/`)) {
        salesRequests.push(url);
      }
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

    // Product creation is controlled test setup. The current Sales Upload UI
    // intentionally sends a CSV only; backend-owned SKU resolution remains the
    // behavior under test.
    const setup = await page.evaluate(
      async ({ apiBaseUrl, setupEmail, setupPassword, setupProductName, setupSku }) => {
        const login = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: setupEmail, password: setupPassword }),
        });
        const loginPayload: unknown = await login.json();
        if (!login.ok || typeof loginPayload !== 'object' || loginPayload === null) {
          return { stage: 'login', status: login.status };
        }
        const accessToken = (
          loginPayload as { data?: { tokens?: { access_token?: unknown } } }
        ).data?.tokens?.access_token;
        if (typeof accessToken !== 'string' || accessToken === '') {
          return { stage: 'login_payload', status: login.status };
        }

        const product = await fetch(`${apiBaseUrl}/api/v1/products`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: setupProductName,
            sku: setupSku,
            unit: 'pcs',
            selling_price: '12.50',
          }),
        });
        return { stage: 'product', status: product.status };
      },
      {
        apiBaseUrl: backendBaseUrl,
        setupEmail: email,
        setupPassword: password,
        setupProductName: productName,
        setupSku: sku,
      },
    );
    expect(setup).toEqual({ stage: 'product', status: 201 });

    await page.goto('/sales/upload');
    await page.getByLabel('Sales CSV file').setInputFiles({
      name: 'sales.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `sale_date,product_sku,quantity,unit_price\n2026-09-23,${sku},2.000,12.50\n`,
      ),
    });
    await expect(page.getByText(/Ready to upload/)).toBeVisible();
    await page.getByRole('button', { name: 'Upload sales CSV' }).click();
    await expect(
      page.getByRole('heading', { name: 'Sales upload complete' }),
    ).toBeVisible();
    await expect(page.getByText(/1 accepted row and 0 rejected rows/)).toBeVisible();

    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: 'Sales History' })).toBeVisible();
    await expect(page.getByText(productName)).toBeVisible();
    await page.getByLabel('Search product or SKU').fill(sku);
    await expect(page.getByText(productName)).toBeVisible();
    await expect(page.getByRole('img', { name: /Sales quantity trend/ })).toBeVisible();

    expect(salesRequests.some((url) => url.endsWith('/api/v1/sales/uploads'))).toBe(
      true,
    );
    expect(
      salesRequests.some((url) => url.includes('/api/v1/sales/transactions?')),
    ).toBe(true);
    expect(
      salesRequests.some((url) => url.includes('/api/v1/sales/transactions/trends?')),
    ).toBe(true);
    expect(inventoryRequests).toHaveLength(0);
  });
});
