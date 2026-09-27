import { expect, test, type Page } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(TEST_EMAIL);
  await page.getByLabel(/^Password/).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Authenticated application shell', () => {
  test('maps existing protected routes into consistent desktop navigation', async ({
    page,
  }) => {
    await signIn(page);

    const navigation = page
      .getByRole('navigation', { name: 'Application navigation' })
      .first();
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await navigation.getByRole('link', { name: 'Products' }).click();
    await expect(page).toHaveURL('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await navigation.getByRole('link', { name: 'Upload sales' }).click();
    await expect(page).toHaveURL('/sales/upload');
    await expect(page.getByRole('heading', { name: 'Sales Upload' })).toBeVisible();
    await expect(
      navigation.getByRole('link', { name: 'Upload sales' }),
    ).toHaveAttribute('aria-current', 'page');

    for (const label of [
      'Forecast runs',
      'Forecast results',
      'Recommendations',
      'Reports',
      'Settings',
    ]) {
      await expect(navigation.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('uses a dismissible mobile drawer and preserves protected navigation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    await page.getByRole('button', { name: 'Open application navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Application navigation' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL('/inventory');
    await expect(drawer).toBeHidden();

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test('exposes account logout through the existing Auth flow', async ({ page }) => {
    await signIn(page);

    await page.locator('details summary').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');
  });
});
