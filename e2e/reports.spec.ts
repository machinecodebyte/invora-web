import { expect, test, type Page } from '@playwright/test';

import {
  REPORTS_E2E_STORAGE_KEY,
  type ReportsE2EFixture,
} from '../src/features/reports/api';
import {
  REPORT_FORECAST_RUN_ID,
  REPORTS_E2E_DATA,
} from '../src/tests/fixtures/reports';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';
const READY_FIXTURE: ReportsE2EFixture = {
  state: 'ready',
  data: REPORTS_E2E_DATA,
};

async function setReportsFixture(
  page: Page,
  fixture: ReportsE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: REPORTS_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(
  page: Page,
  fixture: ReportsE2EFixture = READY_FIXTURE,
): Promise<void> {
  await setReportsFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
}

async function visitReports(
  page: Page,
  fixture: ReportsE2EFixture = READY_FIXTURE,
): Promise<void> {
  await signIn(page, fixture);
  await page.goto('/reports');
}

test.describe('Reports', () => {
  test('redirects unauthenticated visitors before reports are exposed', async ({
    page,
  }) => {
    await page.goto('/reports');

    await expect(page).toHaveURL(/\/login\?redirect=%2Freports$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reports' })).not.toBeVisible();
  });

  test('renders the authenticated sales report and deterministic CSV export state', async ({
    page,
  }) => {
    await visitReports(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Reports' }),
    ).toBeVisible();
    await expect(page.getByLabel('Report type')).toHaveValue('sales_summary');
    await expect(page.getByRole('table', { name: 'Sales summary' })).toBeVisible();
    await expect(page.getByText('Northwind Tea')).toBeVisible();

    await page.getByRole('button', { name: 'Export CSV' }).click();
    await expect(
      page.getByText(
        /CSV export is ready: invora_sales_summary_\d{4}-\d{2}-\d{2}\.csv/u,
      ),
    ).toBeVisible();
  });

  test('validates Demand Forecast context and loads each backend-defined report type', async ({
    page,
  }) => {
    await visitReports(page);

    await page.getByLabel('Report type').selectOption('demand_forecast');
    await expect(
      page.getByText('A forecast run ID is required for the demand forecast report.'),
    ).toBeVisible();
    await page.getByLabel('Forecast run ID (required)').fill(REPORT_FORECAST_RUN_ID);
    await expect(page.getByRole('table', { name: 'Demand forecast' })).toBeVisible();

    await page.getByLabel('Report type').selectOption('model_performance');
    await expect(page.getByRole('table', { name: 'Model performance' })).toBeVisible();

    await page.getByLabel('Report type').selectOption('inventory_risk');
    await expect(page.getByRole('table', { name: 'Inventory risk' })).toBeVisible();

    await page.getByLabel('Report type').selectOption('reorder_summary');
    await expect(page.getByRole('table', { name: 'Reorder summary' })).toBeVisible();
  });

  test('keeps CSV export available for valid empty reports and shows safe load failures', async ({
    page,
  }) => {
    await visitReports(page, { state: 'empty' });
    await expect(page.getByText('No report rows are available.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();

    await setReportsFixture(page, { state: 'error' });
    await page.goto('/reports');
    await expect(
      page.getByText('Unable to load report.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('database');
  });
});
