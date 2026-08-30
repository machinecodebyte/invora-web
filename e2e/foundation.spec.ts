import { expect, test, type ConsoleMessage } from '@playwright/test';

const APP_NAME = 'Invora';
const APP_TAGLINE = 'Predict · Optimize · Replenish';

/**
 * Foundation smoke test.
 *
 * Scope is intentionally narrow: the app boots, the root route renders the
 * brand, and nothing crashes. Business flows arrive with their own modules.
 */
test.describe('Foundation smoke', () => {
  test('root page renders the Invora branding without runtime errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message: ConsoleMessage) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error: Error) => {
      pageErrors.push(error.message);
    });

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1, name: APP_NAME })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText(APP_NAME);
    await expect(page.getByText(APP_TAGLINE).first()).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('document metadata is set', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(`${APP_NAME} · ${APP_TAGLINE}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('landmarks and the skip link make the page keyboard navigable', async ({
    page,
  }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
  });

  test('renders no business data in the foundation module', async ({ page }) => {
    await page.goto('/');

    const body = (await page.locator('body').textContent()) ?? '';

    // The foundation must not simulate any business surface.
    for (const term of ['SKU', 'Reorder', 'Forecast run', 'Total sales', 'Low stock']) {
      expect(body).not.toContain(term);
    }
  });

  test('unknown routes render the not-found page', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page not found.')).toBeVisible();
  });

  test('layout is usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: APP_NAME })).toBeVisible();

    // A horizontally scrolling body is the classic responsive-layout failure.
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
