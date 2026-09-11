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

test.describe('Auth', () => {
  test('login page renders accessible Auth controls', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Invora', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel(/^Email/)).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('login validates missing fields without a network request', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('successful test-only login reaches the protected destination', async ({
    page,
  }) => {
    await signIn(page);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('unauthenticated protected navigation redirects to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('an authenticated user can revisit the protected destination', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/dashboard');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('logout clears frontend state and restores protected-route redirect behavior', async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL('/login');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  });

  test('registration page validates fields and passwords', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible();

    await page.getByLabel(/^Email/).fill('not-an-email');
    await page.getByLabel(/^Password/).fill('weak');
    await page.getByLabel(/^Confirm password/).fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(
      page.getByText('Password must be at least 8 characters.'),
    ).toBeVisible();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });

  test('successful test-only registration establishes a protected session', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByLabel(/^Email/).fill(TEST_EMAIL);
    await page.getByLabel(/^Password/).fill(TEST_PASSWORD);
    await page.getByLabel(/^Confirm password/).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('authenticated users visiting login are returned to the protected route', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/login');

    await expect(page).toHaveURL('/dashboard');
  });
});
