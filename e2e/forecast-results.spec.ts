import { expect, test, type Page } from '@playwright/test';

import {
  FORECAST_RESULTS_E2E_STORAGE_KEY,
  type ForecastResultsE2EFixture,
} from '../src/features/forecasting/api';
import {
  EMPTY_FORECAST_RESULTS_DATA,
  FORECAST_RESULTS_DATA,
  FORECAST_RESULTS_RUN_ID,
} from '../src/tests/fixtures/forecast-results';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';
const READY_FIXTURE: ForecastResultsE2EFixture = {
  state: 'ready',
  data: FORECAST_RESULTS_DATA,
};

async function setForecastResultsFixture(
  page: Page,
  fixture: ForecastResultsE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: FORECAST_RESULTS_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(page: Page, fixture: ForecastResultsE2EFixture = READY_FIXTURE): Promise<void> {
  await setForecastResultsFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  await expect(signInButton).toBeEnabled();
  await signInButton.click();
  await expect(page).toHaveURL('/dashboard');
}

async function visitResults(
  page: Page,
  fixture: ForecastResultsE2EFixture = READY_FIXTURE,
  runId: string = FORECAST_RESULTS_RUN_ID,
): Promise<void> {
  await signIn(page, fixture);
  await page.goto(`/forecasts/results?runId=${runId}`);
}

test.describe('Forecast Results', () => {
  test('redirects unauthenticated visitors before result content is exposed', async ({ page }) => {
    await page.goto(`/forecasts/results?runId=${FORECAST_RESULTS_RUN_ID}`);

    await expect(page).toHaveURL(/\/login\?redirect=%2Fforecasts%2Fresults%3FrunId%3D/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Forecast Results' })).not.toBeVisible();
  });

  test('shows a safe no-selection state for an authenticated user', async ({ page }) => {
    await signIn(page);
    await page.goto('/forecasts/results');

    await expect(page.getByText('Select a forecast run to view results.')).toBeVisible();
  });

  test('renders summary, backend metrics, prediction rows, zero values, and nullable actuals', async ({ page }) => {
    await visitResults(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Forecast Results' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Forecast summary' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Forecast predictions' }).getByText('Zero-demand Widget').first()).toBeVisible();
    await expect(page.getByText('MAPE')).toBeVisible();
    await expect(page.getByText('Actual data is unavailable for 1 period.')).toBeVisible();
    await expect(page.getByRole('img', { name: /Actual observations are available for 2 periods/ })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Forecast predictions' })).not.toContainText('Actual');
  });

  test('filters prediction rows by a backend-supported SKU search', async ({ page }) => {
    await visitResults(page);
    await page.getByLabel('Search product or SKU').fill('BLUE-001');
    await page.getByRole('button', { name: 'Apply filters' }).click();

    await expect(page.getByText('Blue Widget')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Forecast predictions' }).getByText('Zero-demand Widget')).toHaveCount(0);
  });

  test('validates an inverted forecast date range without querying results', async ({ page }) => {
    await visitResults(page);
    await page.getByLabel('Forecast date from').fill('2026-06-04');
    await page.getByLabel('Forecast date to').fill('2026-06-02');
    await page.getByRole('button', { name: 'Apply filters' }).click();

    await expect(page.getByText('End date must be on or after the start date.')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Forecast predictions' }).getByText('Zero-demand Widget').first()).toBeVisible();
  });

  test('renders an honest completed-run empty state', async ({ page }) => {
    await visitResults(page, { state: 'ready', data: EMPTY_FORECAST_RESULTS_DATA }, EMPTY_FORECAST_RESULTS_DATA.overview.runId);
    await expect(page.getByText('No forecast results available.')).toBeVisible();
  });

  test('renders a safe not-ready and failed-run state', async ({ page }) => {
    await visitResults(page, { state: 'not_ready' });
    await expect(page.getByText('Forecast results are not available yet.')).toBeVisible();

    await setForecastResultsFixture(page, { state: 'failed_run' });
    await page.goto(`/forecasts/results?runId=${FORECAST_RESULTS_RUN_ID}`);
    await expect(page.getByText('Forecast results are unavailable because the run failed.')).toBeVisible();
  });

  test('renders a safe service error without implementation detail', async ({ page }) => {
    await visitResults(page, { state: 'error' });
    await expect(page.getByText('Unable to load Forecast Results.', { exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('database');
  });

  test('remains usable without document-level overflow on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await visitResults(page);
    await expect(page.getByRole('heading', { name: 'Forecast summary' })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
