import { expect, test, type Page } from '@playwright/test';

import { DASHBOARD_E2E_STORAGE_KEY } from '../src/features/dashboard/api';
import {
  DASHBOARD_SUMMARY_FIXTURE,
  EMPTY_DASHBOARD_SUMMARY_FIXTURE,
} from '../src/tests/fixtures/dashboard';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';

type DashboardE2EFixture =
  | { readonly state: 'ready'; readonly data: typeof DASHBOARD_SUMMARY_FIXTURE }
  | { readonly state: 'ready'; readonly data: typeof EMPTY_DASHBOARD_SUMMARY_FIXTURE }
  | { readonly state: 'error' };

async function setDashboardFixture(
  page: Page,
  fixture: DashboardE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: DASHBOARD_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(page: Page, fixture: DashboardE2EFixture): Promise<void> {
  await setDashboardFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(TEST_EMAIL);
  await page.getByLabel(/^Password/).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Dashboard', () => {
  test('redirects unauthenticated visitors before Dashboard content is exposed', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Key metrics' })).not.toBeVisible();
  });

  test('renders authenticated Dashboard KPIs and an accessible demand chart', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: DASHBOARD_SUMMARY_FIXTURE });

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Key metrics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Total products' })).toBeVisible();
    await expect(
      page
        .getByRole('article', { name: 'Total products' })
        .getByText('24', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: /Demand trend\. 4 periods/ }),
    ).toBeVisible();
  });

  test('renders deterministic Dashboard alert and high-risk summaries', async ({
    page,
  }) => {
    await signIn(page, { state: 'ready', data: DASHBOARD_SUMMARY_FIXTURE });

    await expect(
      page.getByRole('heading', { name: 'Reorder alerts', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Critical risk')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'High-risk inventory' }),
    ).toBeVisible();
    await expect(page.getByText('Widget Adapter').first()).toBeVisible();
    await expect(page.getByText('Out Of Stock')).toBeVisible();
  });

  test('renders a successful but empty Dashboard summary safely', async ({ page }) => {
    await signIn(page, { state: 'ready', data: EMPTY_DASHBOARD_SUMMARY_FIXTURE });

    await expect(page.getByText('No demand trend data available.')).toBeVisible();
    await expect(page.getByText('No alerts available.')).toBeVisible();
    await expect(page.getByText('No high-risk items available.')).toBeVisible();
  });

  test('renders a safe Dashboard error state without leaking implementation details', async ({
    page,
  }) => {
    await signIn(page, { state: 'error' });

    await expect(
      page.getByText('Unable to load dashboard data.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('DashboardServiceError');
  });

  test('remains usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signIn(page, { state: 'ready', data: DASHBOARD_SUMMARY_FIXTURE });

    await expect(page.getByRole('heading', { name: 'Key metrics' })).toBeVisible();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
