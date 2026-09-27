import { expect, test, type ConsoleMessage } from '@playwright/test';

const APP_NAME = 'INVORA';
const LANDING_TITLE = 'Predict demand. Protect inventory. Replenish with confidence.';

test.describe('Public landing experience', () => {
  test('renders the public product story without runtime errors', async ({ page }) => {
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

    await expect(page.getByRole('banner')).toContainText(APP_NAME);
    await expect(
      page.getByRole('heading', { level: 1, name: LANDING_TITLE }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'From product records to replenishment planning.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'A practical toolkit for inventory intelligence.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'The details behind the planning workflow.' }),
    ).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('All rights reserved.');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('keeps Auth CTAs on their stable public routes', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Get started' }).first().click();
    await expect(page).toHaveURL('/register');

    await page.goto('/');
    await page.getByRole('link', { name: 'Log in' }).first().click();
    await expect(page).toHaveURL('/login');
  });

  test('provides a mobile navigation without horizontal page overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const mobileMenu = page.locator('#landing-mobile-menu');
    await expect(mobileMenu.getByRole('link', { name: 'Capabilities' })).toBeVisible();
    await mobileMenu.getByRole('link', { name: 'Capabilities' }).click();
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test('exposes public metadata and keyboard skip navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(
      'Invora — AI Demand Forecasting & Inventory Replenishment',
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
  });
});
