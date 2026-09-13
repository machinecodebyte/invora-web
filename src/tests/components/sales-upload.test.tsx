import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SalesUploadService } from '@/features/sales/api';
import { SalesUploadProgress } from '@/features/sales/components/sales-upload-progress';
import { SalesUploadView } from '@/features/sales/components/sales-upload-view';
import type { SalesUploadSubmission } from '@/features/sales/types';
import {
  SALES_UPLOAD_ROW_ERROR_SUBMISSION,
  SALES_UPLOAD_SUCCESS_SUBMISSION,
  VALID_SALES_CSV,
  createSalesCsvFile,
} from '@/tests/fixtures/sales-upload';

function successService(): SalesUploadService {
  return {
    uploadSalesCsv: (_file, onProgress) => {
      onProgress({ percent: 50, label: 'Uploading sales CSV' });
      return Promise.resolve(SALES_UPLOAD_SUCCESS_SUBMISSION);
    },
  };
}

async function selectValidFile(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.upload(screen.getByLabelText('Sales CSV file'), createSalesCsvFile());
  await screen.findByText(/Ready to upload/);
}

describe('SalesUploadProgress', () => {
  it('renders semantic progress with text status and value', () => {
    render(
      <SalesUploadProgress progress={{ percent: 50, label: 'Uploading sales CSV' }} />,
    );

    expect(
      screen.getByRole('progressbar', { name: 'Uploading sales CSV: 50%' }),
    ).toHaveValue(50);
    expect(screen.getByText('Uploading sales CSV')).toBeVisible();
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });
});

describe('SalesUploadView', () => {
  it('starts with an accessible file input and validates file-level backend requirements', async () => {
    const user = userEvent.setup();
    render(<SalesUploadView service={successService()} />);

    expect(screen.getByLabelText('Sales CSV file')).toHaveAttribute('type', 'file');
    expect(screen.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();
    expect(
      screen.getByText(/Required headers: sale_date, product_sku, quantity/),
    ).toBeVisible();

    await user.upload(
      screen.getByLabelText('Sales CSV file'),
      createSalesCsvFile(VALID_SALES_CSV, 'sales.xlsx'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only .csv sales uploads are supported.',
    );
    expect(screen.getByRole('button', { name: 'Upload sales CSV' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(screen.getByText(/Choose one UTF-8 CSV file/)).toBeVisible();
  });

  it('selects a valid CSV, disables duplicate submission while progress is active, and renders success', async () => {
    const user = userEvent.setup();
    let resolveSubmission: ((submission: SalesUploadSubmission) => void) | undefined;
    const service: SalesUploadService = {
      uploadSalesCsv: vi.fn((_file, onProgress) => {
        onProgress({ percent: 50, label: 'Uploading sales CSV' });
        return new Promise<SalesUploadSubmission>((resolve) => {
          resolveSubmission = resolve;
        });
      }),
    };
    render(<SalesUploadView service={service} />);

    await selectValidFile(user);
    expect(screen.getByText('sales.csv')).toBeVisible();
    const uploadButton = screen.getByRole('button', { name: 'Upload sales CSV' });
    await user.click(uploadButton);
    await user.click(uploadButton);

    expect(await screen.findByRole('progressbar')).toHaveValue(50);
    expect(screen.getByLabelText('Sales CSV file')).toBeDisabled();
    expect(service.uploadSalesCsv).toHaveBeenCalledTimes(1);

    resolveSubmission?.(SALES_UPLOAD_SUCCESS_SUBMISSION);
    expect(
      await screen.findByRole('heading', { name: 'Sales upload complete' }),
    ).toBeVisible();
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Upload another file' })).toBeVisible();
  });

  it('renders a bounded, safe row-error table from the test-only submission', async () => {
    const user = userEvent.setup();
    render(
      <SalesUploadView
        service={{
          uploadSalesCsv: (_file, onProgress) => {
            onProgress({ percent: 100, label: 'Upload complete' });
            return Promise.resolve(SALES_UPLOAD_ROW_ERROR_SUBMISSION);
          },
        }}
      />,
    );

    await selectValidFile(user);
    await user.click(screen.getByRole('button', { name: 'Upload sales CSV' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Sales upload completed with validation errors',
      }),
    ).toBeVisible();
    expect(screen.getByRole('table', { name: 'Rejected sales rows' })).toBeVisible();
    expect(screen.getByText('invalid_quantity')).toBeVisible();
    expect(screen.getByText('Product SKU was not found for this user.')).toBeVisible();
    expect(screen.queryByText('raw_data')).not.toBeInTheDocument();
  });

  it('normalizes unexpected failures, supports retry, and resets transient upload state', async () => {
    const user = userEvent.setup();
    const uploadSalesCsv = vi
      .fn<SalesUploadService['uploadSalesCsv']>()
      .mockRejectedValueOnce(new Error('database connection details'))
      .mockResolvedValueOnce(SALES_UPLOAD_SUCCESS_SUBMISSION);
    render(<SalesUploadView service={{ uploadSalesCsv }} />);

    await selectValidFile(user);
    await user.click(screen.getByRole('button', { name: 'Upload sales CSV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to upload the sales file.',
    );
    expect(screen.queryByText('database connection details')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry upload' }));
    expect(
      await screen.findByRole('heading', { name: 'Sales upload complete' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Upload another file' }));

    await waitFor(() =>
      expect(screen.getByText(/Choose one UTF-8 CSV file/)).toBeVisible(),
    );
    expect(
      screen.queryByRole('heading', { name: 'Sales upload complete' }),
    ).not.toBeInTheDocument();
    expect(uploadSalesCsv).toHaveBeenCalledTimes(2);
  });
});
