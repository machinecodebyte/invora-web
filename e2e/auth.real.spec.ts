import { expect, test } from '@playwright/test';

const useRealAuthBackend = process.env.PLAYWRIGHT_AUTH_REAL_BACKEND === 'true';

function uniqueTestEmail(): string {
  return (
    'auth-e2e-' +
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2) +
    '@example.test'
  );
}

test.describe('Auth live backend contract', () => {
  test.skip(
    !useRealAuthBackend,
    'Set PLAYWRIGHT_AUTH_REAL_BACKEND=true with a configured backend to run live Auth E2E.',
  );

  test('registers, restores through the refresh cookie, and logs out', async ({
    page,
  }) => {
    const email = uniqueTestEmail();
    const password = 'StrongPass1!';

    await page.goto('/register');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // A reload erases the memory-only access token. Continued access proves the
    // HttpOnly refresh-cookie initialization path works.
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  });
});
