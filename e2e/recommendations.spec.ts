import { expect, test, type Page } from '@playwright/test';

import {
  RECOMMENDATIONS_E2E_STORAGE_KEY,
  type RecommendationsE2EFixture,
} from '../src/features/recommendations/api';
import {
  EMPTY_RECOMMENDATIONS_FIXTURE,
  PAGINATED_RECOMMENDATIONS_FIXTURE,
  RECOMMENDATIONS_FIXTURE,
} from '../src/tests/fixtures/recommendations';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';
const READY_FIXTURE: RecommendationsE2EFixture = {
  state: 'ready',
  data: RECOMMENDATIONS_FIXTURE,
};
const FORECAST_RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function setRecommendationsFixture(
  page: Page,
  fixture: RecommendationsE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: RECOMMENDATIONS_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(
  page: Page,
  fixture: RecommendationsE2EFixture = READY_FIXTURE,
): Promise<void> {
  await setRecommendationsFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  await expect(signInButton).toBeEnabled();
  await signInButton.click();
  await expect(page).toHaveURL('/dashboard');
}

async function visitRecommendations(
  page: Page,
  fixture: RecommendationsE2EFixture = READY_FIXTURE,
): Promise<void> {
  await signIn(page, fixture);
  await page.goto('/recommendations');
}

test.describe('Recommendations', () => {
  test('redirects unauthenticated visitors before recommendation data is exposed', async ({
    page,
  }) => {
    await page.goto('/recommendations');

    await expect(page).toHaveURL(/\/login\?redirect=%2Frecommendations$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Recommendations' }),
    ).not.toBeVisible();
  });

  test('renders an authenticated Recommendations page with filters and risk table', async ({
    page,
  }) => {
    await visitRecommendations(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Recommendations' }),
    ).toBeVisible();
    await expect(page.getByLabel('Search recommendations')).toBeVisible();
    await expect(page.getByLabel('Risk level')).toHaveValue('all');
    await expect(page.getByLabel('Recommendation status')).toHaveValue('all');
    await expect(
      page.getByRole('table', { name: 'Reorder recommendations' }),
    ).toBeVisible();
  });

  test('renders backend risk/status, product/SKU, reorder quantity, and valid zero quantities', async ({
    page,
  }) => {
    await visitRecommendations(page);
    const table = page.getByRole('table', { name: 'Reorder recommendations' });

    await expect(table.getByText('Critical Widget')).toBeVisible();
    await expect(table.getByText('CRIT-001')).toBeVisible();
    await expect(
      table.getByRole('cell', { name: 'Critical', exact: true }),
    ).toBeVisible();
    await expect(
      table.getByRole('cell', { name: 'Acknowledged', exact: true }),
    ).toBeVisible();
    await expect(table.getByText('34 pcs')).toBeVisible();
    const overstockedRow = table.getByRole('row', { name: /Overstocked Box/ });
    await expect(
      overstockedRow.getByRole('cell', { name: '0 pcs', exact: true }),
    ).toHaveCount(2);
    await expect(table.getByText('2.75 kg')).toBeVisible();
  });

  test('filters recommendations by backend-supported risk/status and SKU search', async ({
    page,
  }) => {
    await visitRecommendations(page);
    await page.getByLabel('Risk level').selectOption('critical');
    await expect(page.getByText('Critical Widget')).toBeVisible();
    await expect(page.getByText('High Risk Cable')).not.toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByLabel('Recommendation status').selectOption('acknowledged');
    await expect(page.getByText('High Risk Cable')).toBeVisible();
    await expect(page.getByText('Critical Widget')).not.toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByLabel('Search recommendations').fill('OVER-005');
    await expect(page.getByText('Overstocked Box')).toBeVisible();
    await expect(page.getByText('Critical Widget')).not.toBeVisible();
  });

  test('renders dedicated empty and filtered-empty Recommendation states', async ({
    page,
  }) => {
    await visitRecommendations(page, { state: 'empty' });
    await expect(page.getByText('No recommendations available.')).toBeVisible();

    await setRecommendationsFixture(page, READY_FIXTURE);
    await page.goto('/recommendations');
    await page.getByLabel('Search recommendations').fill('NO-MATCH');
    await expect(
      page.getByText('No recommendations match the current filters.'),
    ).toBeVisible();
  });

  test('renders a safe load error without internal service detail', async ({
    page,
  }) => {
    await visitRecommendations(page, { state: 'error' });
    await expect(
      page.getByText('Unable to load recommendations.', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('database');
  });

  test('uses backend offset pagination with correct boundaries', async ({ page }) => {
    await visitRecommendations(page, {
      state: 'ready',
      data: PAGINATED_RECOMMENDATIONS_FIXTURE,
    });
    await expect(page.getByText('Pagination Product 21')).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Pagination Product 01')).toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('remains usable without document-level overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await visitRecommendations(page);
    await expect(page.getByLabel('Risk level')).toBeVisible();
    await expect(page.getByLabel('Recommendation status')).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Reorder recommendations' }),
    ).toBeVisible();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test('accepts the completed-run empty fixture shape without a table crash', async ({
    page,
  }) => {
    await visitRecommendations(page, {
      state: 'ready',
      data: EMPTY_RECOMMENDATIONS_FIXTURE,
    });
    await expect(page.getByText('No recommendations available.')).toBeVisible();
  });

  test('generates a run-scoped recommendation set and renders the backend summary', async ({
    page,
  }) => {
    await signIn(page, { state: 'not_generated', data: RECOMMENDATIONS_FIXTURE });
    await page.goto(`/recommendations?forecastRunId=${FORECAST_RUN_ID}`);

    await expect(
      page.getByText('Recommendations have not been generated for this forecast run.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Generate recommendations' }).click();
    await expect(
      page.getByRole('heading', { name: 'Recommendation summary' }),
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Reorder recommendations' }),
    ).toBeVisible();
    await expect(page.getByLabel('Search recommendations')).toHaveCount(0);
  });

  test('opens a recommendation detail and persists a supported status transition', async ({
    page,
  }) => {
    await visitRecommendations(page);
    await page
      .getByRole('button', { name: 'View recommendation details for Critical Widget' })
      .click();

    const dialog = page.getByRole('dialog', { name: 'Recommendation details' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Reorder now')).toBeVisible();
    await dialog.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(dialog.getByText('acknowledged')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });
});
