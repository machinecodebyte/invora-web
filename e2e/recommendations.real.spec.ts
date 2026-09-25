import { expect, test } from '@playwright/test';

const useRealRecommendationsBackend =
  process.env.PLAYWRIGHT_RECOMMENDATIONS_REAL_BACKEND === 'true';
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function uniqueTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Recommendations live backend contract', () => {
  test.skip(
    !useRealRecommendationsBackend,
    'Set PLAYWRIGHT_RECOMMENDATIONS_REAL_BACKEND=true with PostgreSQL, Redis, and an RQ worker to run live Recommendations E2E.',
  );

  test('generates, reads, details, and updates an owned backend recommendation', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix();
    const email = `recommendations-e2e-${suffix}@example.test`;
    const password = 'StrongPass1!';
    const observedRequests: Array<{ readonly method: string; readonly path: string }> =
      [];

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.origin === backendBaseUrl &&
        url.pathname.startsWith('/api/v1/recommendations')
      ) {
        observedRequests.push({ method: request.method(), path: url.pathname });
      }
    });

    await page.goto('/register');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Product, Inventory, and Sales are controlled prerequisites. They are
    // created through authenticated backend APIs only because this E2E scope
    // starts at a completed Forecast Run and must not invent Recommendation data.
    const setup = await page.evaluate(
      async ({ apiBaseUrl, setupEmail, setupPassword, suffixValue }) => {
        type Result = {
          readonly ok: boolean;
          readonly status: number;
          readonly data: unknown;
        };
        const request = async (path: string, options: RequestInit): Promise<Result> => {
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
        const accessToken = (
          login.data as { data?: { tokens?: { access_token?: unknown } } }
        ).data?.tokens?.access_token;
        if (!login.ok || typeof accessToken !== 'string' || accessToken === '') {
          return { stage: 'login', status: login.status };
        }
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const product = await request('/api/v1/products', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: `Recommendation product ${suffixValue}`,
            sku: `REC-${suffixValue.toUpperCase()}`,
            unit: 'pcs',
            selling_price: '12.50',
          }),
        });
        const productId = (product.data as { data?: { product?: { id?: unknown } } })
          .data?.product?.id;
        if (!product.ok || typeof productId !== 'string' || productId === '') {
          return { stage: 'product', status: product.status };
        }
        const inventory = await request('/api/v1/inventory/items', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product_id: productId,
            opening_stock: '2.000',
            minimum_stock: '3.000',
            safety_stock: '2.000',
          }),
        });
        if (!inventory.ok) {
          return { stage: 'inventory', status: inventory.status };
        }
        for (const saleDate of ['2026-01-05', '2026-01-12', '2026-01-19']) {
          const sale = await request('/api/v1/sales/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              product_id: productId,
              sale_date: saleDate,
              quantity: '4.000',
              unit_price: '12.50',
              channel: 'e2e',
            }),
          });
          if (!sale.ok) {
            return { stage: 'sales', status: sale.status };
          }
        }
        return { stage: 'complete', status: 201 };
      },
      {
        apiBaseUrl: backendBaseUrl,
        setupEmail: email,
        setupPassword: password,
        suffixValue: suffix,
      },
    );
    expect(setup).toEqual({ stage: 'complete', status: 201 });

    await page.goto('/forecasts/runs');
    await page.getByLabel(/^Forecast horizon/).selectOption('15');
    await page.getByRole('button', { name: 'Start Forecast' }).click();
    await expect(page.getByText('Current status: Completed')).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('link', { name: 'View forecast results' }).click();
    await expect(page.getByRole('link', { name: 'Recommendations' })).toBeVisible();
    await page.getByRole('link', { name: 'Recommendations' }).click();

    await expect(
      page.getByText('Recommendations have not been generated for this forecast run.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Generate recommendations' }).click();
    await expect(
      page.getByRole('heading', { name: 'Recommendation summary' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /View recommendation details for/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Recommendation details' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(dialog.getByText('acknowledged')).toBeVisible();
    await page.getByRole('button', { name: 'Close Recommendation details' }).click();
    await page.getByRole('link', { name: 'All recommendations' }).click();
    await expect(
      page.getByRole('table', { name: 'Reorder recommendations' }),
    ).toBeVisible();

    expect(
      observedRequests.some(
        (request) => request.method === 'POST' && request.path.endsWith('/generate'),
      ),
    ).toBe(true);
    expect(
      observedRequests.some(
        (request) =>
          request.method === 'GET' && request.path === '/api/v1/recommendations',
      ),
    ).toBe(true);
    expect(
      observedRequests.some(
        (request) =>
          request.method === 'GET' && /\/runs\/[0-9a-f-]+$/i.test(request.path),
      ),
    ).toBe(true);
    expect(
      observedRequests.some(
        (request) => request.method === 'GET' && request.path.endsWith('/summary'),
      ),
    ).toBe(true);
    expect(
      observedRequests.some(
        (request) =>
          request.method === 'GET' &&
          /\/recommendations\/[0-9a-f-]+$/i.test(request.path),
      ),
    ).toBe(true);
    expect(
      observedRequests.some(
        (request) => request.method === 'PATCH' && request.path.endsWith('/status'),
      ),
    ).toBe(true);
  });
});
