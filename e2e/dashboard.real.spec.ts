import { expect, test } from '@playwright/test';

const useRealDashboardBackend =
  process.env.PLAYWRIGHT_DASHBOARD_REAL_BACKEND === 'true';
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function uniqueTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Dashboard live backend contract', () => {
  test.skip(
    !useRealDashboardBackend,
    'Set PLAYWRIGHT_DASHBOARD_REAL_BACKEND=true with a controlled backend to run live Dashboard E2E.',
  );

  test('renders the real backend summary with authoritative demand and inventory-risk data', async ({
    page,
  }) => {
    const suffix = uniqueTestSuffix();
    const email = `dashboard-e2e-${suffix}@example.test`;
    const password = 'StrongPass1!';
    const lowProductName = `Dashboard low stock ${suffix}`;
    const outProductName = `Dashboard out of stock ${suffix}`;
    const summaryRequests: Array<{ readonly url: string; readonly hasAuth: boolean }> =
      [];

    page.on('request', (request) => {
      if (request.url().startsWith(`${backendBaseUrl}/api/v1/dashboard/summary`)) {
        summaryRequests.push({
          url: request.url(),
          hasAuth: request.headers().authorization?.startsWith('Bearer ') === true,
        });
      }
    });

    await page.goto('/register');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Inventory-item setup and manual sales transactions are outside the
    // current Dashboard UI scope. These are isolated authenticated test
    // prerequisites only; the Dashboard itself remains read-only.
    const setup = await page.evaluate(
      async ({
        apiBaseUrl,
        setupEmail,
        setupPassword,
        lowName,
        outName,
        suffixValue,
      }) => {
        type BackendResult = {
          readonly ok: boolean;
          readonly status: number;
          readonly data: unknown;
        };

        const request = async (
          path: string,
          options: RequestInit,
        ): Promise<BackendResult> => {
          const response = await fetch(`${apiBaseUrl}${path}`, options);
          return {
            ok: response.ok,
            status: response.status,
            data: (await response.json()) as unknown,
          };
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

        const accessToken = (
          login.data as { data?: { tokens?: { access_token?: unknown } } }
        ).data?.tokens?.access_token;
        if (typeof accessToken !== 'string' || accessToken === '') {
          return { stage: 'login_payload', status: login.status };
        }

        const headers = {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const createProduct = async (
          name: string,
          sku: string,
        ): Promise<BackendResult> =>
          request('/api/v1/products', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name,
              sku,
              unit: 'pcs',
              selling_price: '12.50',
            }),
          });

        const lowProduct = await createProduct(lowName, `DASH-LOW-${suffixValue}`);
        const outProduct = await createProduct(outName, `DASH-OUT-${suffixValue}`);
        if (
          !lowProduct.ok ||
          !outProduct.ok ||
          typeof lowProduct.data !== 'object' ||
          lowProduct.data === null ||
          typeof outProduct.data !== 'object' ||
          outProduct.data === null
        ) {
          return {
            stage: 'products',
            status: lowProduct.ok ? outProduct.status : lowProduct.status,
          };
        }

        const lowProductId = (
          lowProduct.data as { data?: { product?: { id?: unknown } } }
        ).data?.product?.id;
        const outProductId = (
          outProduct.data as { data?: { product?: { id?: unknown } } }
        ).data?.product?.id;
        if (typeof lowProductId !== 'string' || typeof outProductId !== 'string') {
          return { stage: 'product_payload', status: 0 };
        }

        const createInventory = (productId: string, openingStock: string) =>
          request('/api/v1/inventory/items', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              product_id: productId,
              opening_stock: openingStock,
              minimum_stock: '5.000',
              safety_stock: '1.000',
            }),
          });
        const lowInventory = await createInventory(lowProductId, '2.000');
        const outInventory = await createInventory(outProductId, '0.000');
        if (!lowInventory.ok || !outInventory.ok) {
          return {
            stage: 'inventory',
            status: lowInventory.ok ? outInventory.status : lowInventory.status,
          };
        }

        const saleDate = new Date().toISOString().slice(0, 10);
        const createSale = (productId: string, quantity: string) =>
          request('/api/v1/sales/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              product_id: productId,
              sale_date: saleDate,
              quantity,
              unit_price: '12.50',
              channel: 'e2e',
            }),
          });
        const lowSale = await createSale(lowProductId, '2.000');
        const outSale = await createSale(outProductId, '3.000');
        return lowSale.ok && outSale.ok
          ? { stage: 'complete', status: 201 }
          : { stage: 'sales', status: lowSale.ok ? outSale.status : lowSale.status };
      },
      {
        apiBaseUrl: backendBaseUrl,
        setupEmail: email,
        setupPassword: password,
        lowName: lowProductName,
        outName: outProductName,
        suffixValue: suffix.toUpperCase(),
      },
    );
    expect(setup).toEqual({ stage: 'complete', status: 201 });

    const summaryResponse = page.waitForResponse(
      (response) =>
        response.url().startsWith(`${backendBaseUrl}/api/v1/dashboard/summary`) &&
        response.request().method() === 'GET',
    );
    await page.goto('/dashboard');
    expect((await summaryResponse).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Key metrics' })).toBeVisible();
    await expect(
      page
        .getByRole('article', { name: 'Total products' })
        .getByText('2', { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('article', { name: 'Inventory items' })
        .getByText('2', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: /Demand trend\./ })).toBeVisible();
    await expect(page.getByText(lowProductName)).toBeVisible();
    await expect(page.getByText(outProductName)).toBeVisible();
    await expect(page.getByText('No alerts available.')).toBeVisible();

    expect(summaryRequests.some((request) => request.hasAuth)).toBe(true);
    expect(summaryRequests.some((request) => request.url.endsWith('/summary'))).toBe(
      true,
    );
  });
});
