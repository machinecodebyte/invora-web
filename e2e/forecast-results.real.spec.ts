import { expect, test } from '@playwright/test';

const useRealForecastResultsBackend =
  process.env.PLAYWRIGHT_FORECAST_RESULTS_REAL_BACKEND === 'true';
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function uniqueTestSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('Forecast Results live backend contract', () => {
  test.skip(
    !useRealForecastResultsBackend,
    'Set PLAYWRIGHT_FORECAST_RESULTS_REAL_BACKEND=true with PostgreSQL, Redis, and an RQ worker to run live Forecast Results E2E.',
  );

  test('shows persisted results for a completed Forecast Run', async ({ page }) => {
    test.setTimeout(75_000);
    const suffix = uniqueTestSuffix();
    const email = `forecast-results-e2e-${suffix}@example.test`;
    const password = 'StrongPass1!';
    const observedRequests: Array<{ readonly path: string; readonly method: string }> =
      [];

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin === backendBaseUrl && url.pathname.startsWith('/api/v1/')) {
        observedRequests.push({ path: url.pathname, method: request.method() });
      }
    });

    await page.goto('/register');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Product and sales are isolated worker prerequisites. The Forecast Run is
    // created and completed through the real frontend lifecycle below.
    const setup = await page.evaluate(
      async ({ apiBaseUrl, setupEmail, setupPassword, suffixValue }) => {
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
        const product = await request('/api/v1/products', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: `Forecast result product ${suffixValue}`,
            sku: `RESULT-${suffixValue.toUpperCase()}`,
            unit: 'pcs',
            selling_price: '12.50',
          }),
        });
        if (!product.ok || typeof product.data !== 'object' || product.data === null) {
          return { stage: 'product', status: product.status };
        }

        const productId = (product.data as { data?: { product?: { id?: unknown } } })
          .data?.product?.id;
        if (typeof productId !== 'string' || productId === '') {
          return { stage: 'product_payload', status: product.status };
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
    await expect(page).toHaveURL(/\/forecasts\/results\?runId=/);
    await expect(page.getByRole('heading', { name: 'Forecast summary' })).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Forecast predictions' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Evaluation metrics' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Actual vs predicted demand' }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: /View forecast detail for/ })
      .first()
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Product forecast detail' }),
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Product forecast detail' }),
    ).toBeVisible();

    const resultPath = '/api/v1/forecast-results/runs/';
    expect(
      observedRequests.some(
        (request) =>
          request.method === 'GET' &&
          request.path.startsWith(resultPath) &&
          !request.path.includes('/predictions') &&
          !request.path.includes('/metrics') &&
          !request.path.includes('/chart') &&
          !request.path.includes('/products/'),
      ),
    ).toBe(true);
    for (const suffixPath of ['/predictions', '/metrics', '/chart', '/products/']) {
      expect(
        observedRequests.some(
          (request) =>
            request.method === 'GET' &&
            request.path.startsWith(resultPath) &&
            request.path.includes(suffixPath),
        ),
      ).toBe(true);
    }
    expect(
      observedRequests.some((request) =>
        request.path.startsWith('/api/v1/recommendations'),
      ),
    ).toBe(false);
  });
});
