import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const useRealDashboardBackend =
  process.env.PLAYWRIGHT_DASHBOARD_REAL_BACKEND === 'true';
const useRealSalesBackend = process.env.PLAYWRIGHT_SALES_REAL_BACKEND === 'true';
const useRealInventoryBackend =
  process.env.PLAYWRIGHT_INVENTORY_REAL_BACKEND === 'true';
const useRealForecastRunBackend =
  process.env.PLAYWRIGHT_FORECAST_RUN_REAL_BACKEND === 'true';
const useRealForecastResultsBackend =
  process.env.PLAYWRIGHT_FORECAST_RESULTS_REAL_BACKEND === 'true';
const useRealRecommendationsBackend =
  process.env.PLAYWRIGHT_RECOMMENDATIONS_REAL_BACKEND === 'true';
const useRealAuthBackend =
  process.env.PLAYWRIGHT_AUTH_REAL_BACKEND === 'true' ||
  useRealDashboardBackend ||
  useRealInventoryBackend ||
  useRealSalesBackend ||
  useRealForecastRunBackend ||
  useRealForecastResultsBackend ||
  useRealRecommendationsBackend;
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

/**
 * E2E runs against a production build by default so the smoke test observes the
 * same output users get (no dev-only overlays or HMR noise). Override with
 * PLAYWRIGHT_WEB_SERVER_COMMAND="npm run dev" for a faster local loop, or set
 * PLAYWRIGHT_BASE_URL to target an already-running server.
 */
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'npm run build && npm run start';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Serial in CI for deterministic runs; locally Playwright picks the count.
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? 'local',
      // The deterministic adapter remains the default E2E fixture. Any real
      // browser contract requires the real cookie-session boundary.
      NEXT_PUBLIC_AUTH_E2E_TEST_MODE: useRealAuthBackend ? 'false' : 'true',
      // Enables the fixture reader only in the Playwright-managed build.
      // The Dashboard fixture is the default deterministic E2E adapter. The
      // explicit live Dashboard contract disables it without changing other
      // feature fixtures.
      NEXT_PUBLIC_DASHBOARD_E2E_TEST_MODE: useRealDashboardBackend ? 'false' : 'true',
      // Enables the Product Catalog fixture adapter only in E2E builds.
      NEXT_PUBLIC_PRODUCTS_E2E_TEST_MODE: 'true',
      // The fixture is the default E2E adapter. The explicit real Inventory
      // contract disables it while leaving every unrelated feature fixture intact.
      NEXT_PUBLIC_INVENTORY_E2E_TEST_MODE: useRealInventoryBackend ? 'false' : 'true',
      // The Sales fixture is default deterministic E2E behavior. The explicit
      // real Sales contract disables it and keeps every unrelated fixture intact.
      NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE: useRealSalesBackend ? 'false' : 'true',
      // The fixture is the default deterministic E2E adapter. The explicit
      // real Forecast Run contract disables it without affecting result tests.
      NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE: useRealForecastRunBackend
        ? 'false'
        : 'true',
      // The fixture is default deterministic E2E behavior. The explicit live
      // Results contract disables it without changing unrelated fixtures.
      NEXT_PUBLIC_FORECAST_RESULTS_E2E_TEST_MODE: useRealForecastResultsBackend
        ? 'false'
        : 'true',
      // The fixture is default deterministic E2E behavior. The explicit live
      // Recommendations contract disables it without affecting other fixtures.
      NEXT_PUBLIC_RECOMMENDATIONS_E2E_TEST_MODE: useRealRecommendationsBackend
        ? 'false'
        : 'true',
      PORT: String(port),
    },
  },
});
