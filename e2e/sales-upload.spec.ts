import { expect, test, type Page } from '@playwright/test';

import {
  SALES_UPLOAD_E2E_STORAGE_KEY,
  type SalesUploadE2EFixture,
} from '../src/features/sales/api';
import {
  MISSING_HEADER_SALES_CSV,
  SALES_UPLOAD_ROW_ERROR_SUBMISSION,
  SALES_UPLOAD_SUCCESS_SUBMISSION,
  VALID_SALES_CSV,
} from '../src/tests/fixtures/sales-upload';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongPass1!';
const MAX_SALES_UPLOAD_BYTES = 5 * 1024 * 1024;
const SUCCESS_FIXTURE: SalesUploadE2EFixture = {
  state: 'success',
  submission: SALES_UPLOAD_SUCCESS_SUBMISSION,
};
const ROW_ERROR_FIXTURE: SalesUploadE2EFixture = {
  state: 'row_errors',
  submission: SALES_UPLOAD_ROW_ERROR_SUBMISSION,
};

async function setSalesUploadFixture(
  page: Page,
  fixture: SalesUploadE2EFixture,
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, testFixture }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(testFixture));
    },
    { storageKey: SALES_UPLOAD_E2E_STORAGE_KEY, testFixture: fixture },
  );
}

async function signIn(page: Page, fixture: SalesUploadE2EFixture): Promise<void> {
  await setSalesUploadFixture(page, fixture);
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(TEST_EMAIL);
  await page.getByLabel(/^Password/).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/sales/upload');
  await expect(page).toHaveURL('/sales/upload');
}

async function selectFile(
  page: Page,
  name: string,
  content: string | Buffer,
  mimeType = 'text/csv',
): Promise<void> {
  await page.getByLabel('Sales CSV file').setInputFiles({
    name,
    mimeType,
    buffer: typeof content === 'string' ? Buffer.from(content) : content,
  });
}

test.describe('Sales Upload', () => {
  test('redirects unauthenticated visitors before Sales Upload content is exposed', async ({
    page,
  }) => {
    await page.goto('/sales/upload');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fsales%2Fupload$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sales Upload' })).not.toBeVisible();
  });

  test('renders the protected Sales Upload page for an authenticated test user', async ({
    page,
  }) => {
    await signIn(page, SUCCESS_FIXTURE);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Sales Upload' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload sales CSV' })).toBeVisible();
    await expect(page.getByLabel('Sales CSV file')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();
  });

  test('selects a valid CSV and enables upload only after preflight succeeds', async ({
    page,
  }) => {
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'sales.csv', VALID_SALES_CSV);

    await expect(page.getByText('sales.csv')).toBeVisible();
    await expect(page.getByText(/Ready to upload/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeEnabled();
  });

  test('rejects unsupported files before upload', async ({ page }) => {
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'sales.xlsx', VALID_SALES_CSV);

    await expect(
      page.getByText('Only .csv sales uploads are supported.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();
  });

  test('rejects CSV files missing a required backend header', async ({ page }) => {
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'sales.csv', MISSING_HEADER_SALES_CSV);

    await expect(
      page.getByText('Sales CSV is missing required columns: quantity.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();
  });

  test('shows deterministic upload progress, prevents duplicate submission, and completes', async ({
    page,
  }) => {
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'sales.csv', VALID_SALES_CSV);
    const uploadButton = page.getByRole('button', { name: 'Upload sales CSV' });

    await uploadButton.click();
    const progressbar = page.getByRole('progressbar', {
      name: /Uploading sales CSV/,
    });
    await expect(progressbar).toBeVisible();
    await expect(progressbar).toHaveAttribute('value', '25');
    await expect(uploadButton).toBeDisabled();
    await expect(
      page.getByRole('heading', { name: 'Sales upload complete' }),
    ).toBeVisible();
    await expect(page.getByText(/2 accepted rows and 0 rejected rows/)).toBeVisible();
  });

  test('renders backend-shaped row validation errors without exposing raw CSV rows', async ({
    page,
  }) => {
    await signIn(page, ROW_ERROR_FIXTURE);
    await selectFile(page, 'sales.csv', VALID_SALES_CSV);
    await page.getByRole('button', { name: 'Upload sales CSV' }).click();

    await expect(
      page.getByRole('heading', {
        name: 'Sales upload completed with validation errors',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Rejected sales rows' }),
    ).toBeVisible();
    await expect(page.getByText('invalid_quantity')).toBeVisible();
    await expect(
      page.getByText('Product SKU was not found for this user.'),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('raw_data');
  });

  test('shows a safe upload failure with retry and reset controls', async ({
    page,
  }) => {
    await signIn(page, { state: 'error' });
    await selectFile(page, 'sales.csv', VALID_SALES_CSV);
    await page.getByRole('button', { name: 'Upload sales CSV' }).click();

    await expect(page.getByText('Unable to upload the sales file.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry upload' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('SalesUploadServiceError');
    await page.getByRole('button', { name: 'Remove file' }).click();
    await expect(page.getByText(/Choose one UTF-8 CSV file/)).toBeVisible();
  });

  test('resets a successful upload and allows another file to be selected', async ({
    page,
  }) => {
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'sales.csv', VALID_SALES_CSV);
    await page.getByRole('button', { name: 'Upload sales CSV' }).click();
    await expect(
      page.getByRole('heading', { name: 'Sales upload complete' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Upload another file' }).click();
    await expect(page.getByText(/Choose one UTF-8 CSV file/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();
    await selectFile(page, 'another-sales.csv', VALID_SALES_CSV);
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeEnabled();
  });

  test('rejects empty and oversized CSV files in frontend preflight', async ({
    page,
  }) => {
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'empty.csv', '');
    await expect(page.getByText('Sales upload file is empty.')).toBeVisible();

    await selectFile(page, 'oversized.csv', Buffer.alloc(MAX_SALES_UPLOAD_BYTES + 1));
    await expect(
      page.getByText('Sales upload file is too large. The maximum size is 5 MiB.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();
  });

  test('remains usable without document-level overflow on a mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signIn(page, SUCCESS_FIXTURE);
    await selectFile(page, 'sales.csv', VALID_SALES_CSV);

    await expect(page.getByRole('button', { name: 'Upload sales CSV' })).toBeEnabled();
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
