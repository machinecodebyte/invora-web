import { expect, test, type Page } from '@playwright/test';

import {
  SETTINGS_E2E_STORAGE_KEY,
  type SettingsE2EFixture,
} from '../src/features/settings/api';
import { SETTINGS_FIXTURE } from '../src/tests/fixtures/settings';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';
const READY_FIXTURE: SettingsE2EFixture = {
  state: 'ready',
  data: SETTINGS_FIXTURE,
};

async function setSettingsFixture(
  page: Page,
  fixture: SettingsE2EFixture,
  replace = false,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture, shouldReplace }) => {
      if (shouldReplace || window.sessionStorage.getItem(storageKey) === null) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
      }
    },
    {
      storageKey: SETTINGS_E2E_STORAGE_KEY,
      testFixture: fixture,
      shouldReplace: replace,
    },
  );
}

async function signIn(
  page: Page,
  fixture: SettingsE2EFixture = READY_FIXTURE,
): Promise<void> {
  await setSettingsFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
}

async function visitSettings(
  page: Page,
  fixture: SettingsE2EFixture = READY_FIXTURE,
): Promise<void> {
  await signIn(page, fixture);
  await page.goto('/settings');
}

test.describe('Settings', () => {
  test('redirects unauthenticated visitors before Settings data is exposed', async ({
    page,
  }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
  });

  test('loads the two approved Settings categories through the protected route', async ({
    page,
  }) => {
    await visitSettings(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Forecast Defaults' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Safety Stock Defaults' }),
    ).toBeVisible();
    await expect(page.getByLabel('Default forecast horizon')).toHaveValue('15');
    await expect(page.getByLabel('Default safety stock quantity')).toHaveValue('0.000');
  });

  test('saves Forecast Defaults, preserves a false boolean, and reloads fixture state', async ({
    page,
  }) => {
    await visitSettings(page, {
      state: 'ready',
      data: {
        ...SETTINGS_FIXTURE,
        forecastDefaults: {
          ...SETTINGS_FIXTURE.forecastDefaults,
          autoProcessEnabled: true,
        },
      },
    });

    await page.getByLabel('Default forecast horizon').selectOption('30');
    await page.getByLabel('Minimum history window (days)').fill('60');
    await page.getByLabel('Default forecast model').selectOption('random_forest');
    await page.getByLabel('Automatically process new forecast runs').uncheck();
    await page.getByRole('button', { name: 'Save forecast defaults' }).click();

    await expect(page.getByText('Forecast defaults saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Default forecast horizon')).toHaveValue('30');
    await expect(page.getByLabel('Minimum history window (days)')).toHaveValue('60');
    await expect(page.getByLabel('Default forecast model')).toHaveValue(
      'random_forest',
    );
    await expect(
      page.getByLabel('Automatically process new forecast runs'),
    ).not.toBeChecked();
  });

  test('validates and persists Safety Stock without exposing internal error detail', async ({
    page,
  }) => {
    await visitSettings(page);
    const safetyStock = page.getByLabel('Default safety stock quantity');

    await safetyStock.fill('1.2345');
    await expect(
      page.getByText('Enter a non-negative quantity with up to 3 decimal places.'),
    ).toBeVisible();

    await safetyStock.fill('12.500');
    await page.getByRole('button', { name: 'Save safety stock defaults' }).click();
    await expect(page.getByText('Safety stock defaults saved.')).toBeVisible();
    await page.reload();
    await expect(safetyStock).toHaveValue('12.500');

    await setSettingsFixture(page, { state: 'error' }, true);
    await page.goto('/settings');
    await expect(page.getByText('Unable to load settings.')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('database');
  });
});
