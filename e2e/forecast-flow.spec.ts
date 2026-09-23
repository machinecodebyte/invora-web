import { expect, test, type Page } from '@playwright/test';

import {
  FORECAST_RUN_E2E_STORAGE_KEY,
  type ForecastRunE2EFixture,
} from '../src/features/forecasting/api';
import {
  FORECAST_JOB_FAILED_SEQUENCE,
  FORECAST_JOB_SEQUENCE,
  FORECAST_RUN_FAILED_SEQUENCE,
  FORECAST_RUN_PENDING,
  FORECAST_RUN_SEQUENCE,
} from '../src/tests/fixtures/forecast-run';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';
const SUCCESS_FIXTURE: ForecastRunE2EFixture = {
  state: 'sequence',
  runs: FORECAST_RUN_SEQUENCE,
  jobs: FORECAST_JOB_SEQUENCE,
};
const FAILED_FIXTURE: ForecastRunE2EFixture = {
  state: 'sequence',
  runs: FORECAST_RUN_FAILED_SEQUENCE,
  jobs: FORECAST_JOB_FAILED_SEQUENCE,
};

async function setForecastRunFixture(
  page: Page,
  fixture: ForecastRunE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: FORECAST_RUN_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(
  page: Page,
  fixture: ForecastRunE2EFixture = SUCCESS_FIXTURE,
): Promise<void> {
  await setForecastRunFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/forecasts/runs');
  await expect(page).toHaveURL('/forecasts/runs');
}

test.describe('Forecast Run', () => {
  // Each case uses an isolated browser context, but serial execution prevents
  // concurrent cold-start hydration from obscuring the Auth-route assertions.
  test.describe.configure({ mode: 'serial' });

  test('redirects unauthenticated visitors before Forecast Run content is exposed', async ({
    page,
  }) => {
    await page.goto('/forecasts/runs');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fforecasts%2Fruns$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Forecast Run' })).not.toBeVisible();
  });

  test('renders the protected forecast-run form with only backend-supported horizons', async ({
    page,
  }) => {
    await signIn(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Forecast Run' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Start a forecast run' }),
    ).toBeVisible();
    await expect(page.getByLabel(/^Forecast horizon/)).toHaveValue('');
    await expect(page.getByRole('option')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Start Forecast' })).toBeDisabled();
  });

  test('requires a horizon selection before a run can start', async ({ page }) => {
    await signIn(page);
    const horizon = page.getByLabel(/^Forecast horizon/);

    await horizon.focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByText('Choose a forecast horizon of 7, 15, or 30 days.'),
    ).toBeVisible();
    await expect(horizon).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('button', { name: 'Start Forecast' })).toBeDisabled();
  });

  test('starts and manually reconciles deterministic pending, running, and completed states', async ({
    page,
  }) => {
    await signIn(page);
    await page.getByLabel(/^Forecast horizon/).selectOption('15');
    await page.getByRole('button', { name: 'Start Forecast' }).click();

    await expect(page.getByText('Current status: Pending')).toBeVisible();
    await expect(page.getByText('Processing status: Queued')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start Forecast' }),
    ).not.toBeVisible();
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(page.getByText('Current status: Running')).toBeVisible();
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(page.getByText('Current status: Completed')).toBeVisible();
    await expect(
      page.getByText(/Detailed forecast results are not shown in this module\./),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Predicted demand');
  });

  test('shows a safe failed state and resets for another forecast', async ({
    page,
  }) => {
    await signIn(page, FAILED_FIXTURE);
    await page.getByLabel(/^Forecast horizon/).selectOption('7');
    await page.getByRole('button', { name: 'Start Forecast' }).click();
    await page.getByRole('button', { name: 'Refresh status' }).click();

    await expect(page.getByText('Current status: Failed')).toBeVisible();
    await expect(page.getByText('Forecast run failed.')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(
      'test-only internal execution detail',
    );
    await page.getByRole('button', { name: 'Start another forecast' }).click();
    await expect(
      page.getByRole('heading', { name: 'Start a forecast run' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Forecast' })).toBeDisabled();
  });

  test('keeps the responsive form within a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signIn(page);
    await page.getByLabel(/^Forecast horizon/).selectOption('15');

    await expect(page.getByRole('button', { name: 'Start Forecast' })).toBeEnabled();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test('renders a safe status refresh failure without backend details', async ({
    page,
  }) => {
    await signIn(page, {
      state: 'status_error',
      run: FORECAST_RUN_PENDING,
      job: FORECAST_JOB_SEQUENCE[0]!,
    });
    await page.getByLabel(/^Forecast horizon/).selectOption('15');
    await page.getByRole('button', { name: 'Start Forecast' }).click();
    await page.getByRole('button', { name: 'Refresh status' }).click();

    await expect(
      page.getByText('Unable to refresh forecast run status.'),
    ).toBeVisible();
    await expect(page.getByText('Current status: Pending')).toBeVisible();
  });
});
