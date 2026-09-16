import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ReportsServiceError, type ReportsService } from '@/features/reports/api';
import { ReportsView } from '@/features/reports/components/reports-view';
import type { ReportData, ReportExportResult } from '@/features/reports/types';
import {
  REPORT_FORECAST_RUN_ID,
  createReportsTestService,
  reportWithNoRows,
} from '@/tests/fixtures/reports';

describe('ReportsView', () => {
  it('renders the sales report with its backend-defined table fields, summary, zeroes, and nulls', async () => {
    render(<ReportsView service={createReportsTestService()} />);

    const table = await screen.findByRole('table', { name: 'Sales summary' });
    expect(screen.getByRole('heading', { name: 'Sales summary' })).toBeVisible();
    expect(screen.getByText('Northwind Tea')).toBeVisible();
    expect(screen.getByText('Northwind Coffee')).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: 'Sales amount' })).toBeVisible();
    expect(within(table).getAllByRole('cell', { name: '0.00' })).toHaveLength(1);
    expect(within(table).getAllByRole('cell', { name: '—' })).not.toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Total sales' })).toBeVisible();
    expect(screen.getAllByText('125.50')).not.toHaveLength(0);
  });

  it('selects backend report types and applies only the active report filters', async () => {
    const user = userEvent.setup();
    render(<ReportsView service={createReportsTestService()} />);
    await screen.findByRole('table', { name: 'Sales summary' });

    await user.selectOptions(screen.getByLabelText('Report type'), 'reorder_summary');
    const table = await screen.findByRole('table', { name: 'Reorder summary' });
    expect(screen.getByLabelText('Risk level')).toBeVisible();
    expect(screen.getByLabelText('Recommendation status')).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: 'Reorder quantity' })).toBeVisible();
    expect(screen.queryByLabelText('Sales channel')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Risk level'), 'critical');
    expect(await screen.findByText('Critical Widget')).toBeVisible();
    await waitFor(() => expect(screen.queryByText('Medium Cable')).not.toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('Recommendation status'), 'acknowledged');
    expect(await screen.findByText('No report rows match the current filters.')).toBeVisible();
  });

  it('validates a required demand forecast run and an invalid date range before loading', async () => {
    const user = userEvent.setup();
    render(<ReportsView service={createReportsTestService()} />);
    await screen.findByRole('table', { name: 'Sales summary' });

    await user.selectOptions(screen.getByLabelText('Report type'), 'demand_forecast');
    expect(
      await screen.findByText('A forecast run ID is required for the demand forecast report.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Forecast run ID (required)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await user.type(screen.getByLabelText('Forecast run ID (required)'), REPORT_FORECAST_RUN_ID);
    expect(await screen.findByRole('table', { name: 'Demand forecast' })).toBeVisible();

    const startDate = screen.getByLabelText('Start date');
    const endDate = screen.getByLabelText('End date');
    await user.type(startDate, '2026-10-10');
    await user.type(endDate, '2026-10-01');
    expect(await screen.findByText('End date must be on or after the start date.')).toBeVisible();
    expect(endDate).toHaveAttribute('aria-invalid', 'true');
  });

  it('uses distinct empty and filtered-empty states and resets only report filters', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ReportsView
        service={createReportsTestService({
          data: { sales_summary: reportWithNoRows('sales_summary') },
        })}
      />,
    );
    expect(await screen.findByText('No report rows are available.')).toBeVisible();

    rerender(<ReportsView service={createReportsTestService()} />);
    await screen.findByRole('table', { name: 'Sales summary' });
    await user.type(screen.getByLabelText('Sales channel'), 'No matching channel');
    expect(await screen.findByText('No report rows match the current filters.')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Reset report filters' })[0]!);
    expect(await screen.findByRole('table', { name: 'Sales summary' })).toBeVisible();
  });

  it('shows a loading state, normalizes unknown errors, and keeps safe service errors', async () => {
    let resolveReport: ((report: ReportData) => void) | undefined;
    const loadingService: ReportsService = {
      getReport: () =>
        new Promise<ReportData>((resolve) => {
          resolveReport = resolve;
        }),
      exportReport: () =>
        Promise.resolve({
          filename: 'invora_sales_summary_2026-09-15.csv',
          contentType: 'text/csv',
        }),
    };
    const { rerender } = render(<ReportsView service={loadingService} />);
    expect(screen.getByRole('status', { name: 'Loading report' })).toBeVisible();
    if (resolveReport === undefined) {
      throw new Error('Report resolver was not initialized.');
    }
    resolveReport(reportWithNoRows('sales_summary'));
    expect(await screen.findByText('No report rows are available.')).toBeVisible();

    rerender(
      <ReportsView
        service={createReportsTestService({ getReportError: new Error('database trace') })}
      />,
    );
    expect(await screen.findByText('Unable to load report.')).toBeVisible();
    expect(screen.queryByText('database trace')).not.toBeInTheDocument();

    rerender(
      <ReportsView
        service={createReportsTestService({
          getReportError: new ReportsServiceError(
            'reports_unavailable',
            'Reports are temporarily unavailable.',
          ),
        })}
      />,
    );
    expect(await screen.findByText('Reports are temporarily unavailable.')).toBeVisible();
  });

  it('prevents duplicate CSV exports while pending, then shows safe success metadata', async () => {
    const user = userEvent.setup();
    let resolveExport: ((result: ReportExportResult) => void) | undefined;
    const exportResult = new Promise<ReportExportResult>((resolve) => {
      resolveExport = resolve;
    });
    const service = createReportsTestService({ exportResult });
    render(<ReportsView service={service} />);
    await screen.findByRole('table', { name: 'Sales summary' });

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    await user.click(exportButton);
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute('aria-busy', 'true');
    if (resolveExport === undefined) {
      throw new Error('Export resolver was not initialized.');
    }
    resolveExport({
      filename: 'invora_sales_summary_2026-09-15.csv',
      contentType: 'text/csv',
    });
    expect(
      await screen.findByText('CSV export is ready: invora_sales_summary_2026-09-15.csv'),
    ).toBeVisible();
    expect(exportButton).toBeEnabled();
  });

  it('presents a normalized CSV export failure without creating a download', async () => {
    const user = userEvent.setup();
    render(
      <ReportsView
        service={createReportsTestService({ exportError: new Error('storage trace') })}
      />,
    );
    await screen.findByRole('table', { name: 'Sales summary' });
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText('Unable to export report.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument();
  });
});
