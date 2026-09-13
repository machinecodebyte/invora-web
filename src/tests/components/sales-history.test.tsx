import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  SalesHistoryServiceError,
  type SalesHistoryService,
} from '@/features/sales/api';
import { SalesHistoryChart } from '@/features/sales/components/sales-history-chart';
import { SalesHistoryTable } from '@/features/sales/components/sales-history-table';
import { SalesHistoryView } from '@/features/sales/components/sales-history-view';
import type { SalesHistoryPage, SalesTransaction } from '@/features/sales/types';
import {
  SALES_HISTORY_TRENDS_FIXTURE,
  SALES_HISTORY_TRANSACTIONS_FIXTURE,
  createSalesHistoryTestService,
} from '@/tests/fixtures/sales-history';

function pageFor(
  transactions: readonly SalesTransaction[],
  overrides: Partial<Pick<SalesHistoryPage, 'limit' | 'offset' | 'total'>> = {},
): SalesHistoryPage {
  return {
    transactions,
    total: overrides.total ?? transactions.length,
    limit: overrides.limit ?? 50,
    offset: overrides.offset ?? 0,
  };
}

describe('SalesHistoryTable', () => {
  it('renders semantic backend-aligned transaction fields and preserves zero values', () => {
    const zeroQuantityTransaction: SalesTransaction = {
      ...SALES_HISTORY_TRANSACTIONS_FIXTURE[2]!,
      id: 'test-sale-zero-quantity',
      quantity: 0,
    };
    render(
      <SalesHistoryTable
        page={pageFor([
          SALES_HISTORY_TRANSACTIONS_FIXTURE[0]!,
          zeroQuantityTransaction,
        ])}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('table', { name: 'Sales history' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Sale amount' })).toBeVisible();
    expect(screen.queryByText('12 Mar 2026')).not.toBeInTheDocument();
    expect(screen.getByText('Mar 12, 2026')).toBeVisible();
    expect(screen.getByText('Test Widget Cable')).toBeVisible();
    expect(screen.getByText('TEST-CBL-001')).toBeVisible();
    expect(screen.getByText('CSV upload')).toBeVisible();
    expect(screen.getByText('0')).toBeVisible();
    expect(screen.getAllByText('0.00')).toHaveLength(2);
  });

  it('supports the backend offset/limit pagination model with accessible boundaries', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <SalesHistoryTable
        page={pageFor(SALES_HISTORY_TRANSACTIONS_FIXTURE.slice(0, 2), {
          total: 3,
          limit: 2,
        })}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Page 1 of 2')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Previous sales history page' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next sales history page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <SalesHistoryTable
        page={pageFor([SALES_HISTORY_TRANSACTIONS_FIXTURE[2]!], {
          total: 3,
          limit: 2,
          offset: 2,
        })}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText('Page 2 of 2')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Next sales history page' }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Previous sales history page' }),
    );
    expect(onPageChange).toHaveBeenLastCalledWith(0);
  });
});

describe('SalesHistoryChart', () => {
  it('renders an accessible quantity trend plus empty and loading states', () => {
    const { rerender } = render(
      <SalesHistoryChart points={SALES_HISTORY_TRENDS_FIXTURE} />,
    );

    expect(
      screen.getByRole('img', { name: /Sales quantity trend\. 3 reporting periods/ }),
    ).toBeVisible();
    expect(screen.getByText(/16\.5 total units sold/)).toBeVisible();

    rerender(<SalesHistoryChart points={[]} />);
    expect(
      screen.getByText('No sales data available for the selected period.'),
    ).toBeVisible();

    rerender(<SalesHistoryChart points={[]} isLoading />);
    expect(
      screen.getByRole('status', { name: 'Loading sales quantity trend' }),
    ).toBeVisible();
  });
});

describe('SalesHistoryView', () => {
  it('filters by backend-supported product/SKU search, source, and inclusive dates, then resets', async () => {
    const user = userEvent.setup();
    render(<SalesHistoryView service={createSalesHistoryTestService()} />);

    expect(await screen.findByText('Test Widget Cable')).toBeVisible();

    await user.type(screen.getByLabelText('Search product or SKU'), 'TEST-ADP-002');
    await waitFor(() => expect(screen.getByText('Test Widget Adapter')).toBeVisible());
    expect(screen.queryByText('Test Widget Cable')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('Test Widget Cable')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'manual' } });
    expect(await screen.findByText('Test Widget Adapter')).toBeVisible();
    expect(screen.queryByText('Test Widget Cable')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-03-08' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-03-08' },
    });
    expect(await screen.findByText('Mar 8, 2026')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-03-12' },
    });
    expect(
      await screen.findByText('End date must be on or after the start date.'),
    ).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('End date')).toHaveAttribute('aria-invalid', 'true');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('Test Widget Cable')).toBeVisible();
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('End date')).toHaveValue('');
  });

  it('distinguishes no records from a valid filtered-empty result', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SalesHistoryView
        service={createSalesHistoryTestService({ transactions: [], trends: [] })}
      />,
    );

    expect(await screen.findByText('No sales records available.')).toBeVisible();

    rerender(<SalesHistoryView service={createSalesHistoryTestService()} />);
    expect(await screen.findByText('Test Widget Cable')).toBeVisible();
    await user.type(
      screen.getByLabelText('Search product or SKU'),
      'not-a-test-product',
    );
    expect(await screen.findByText('No matching sales records.')).toBeVisible();
    expect(
      screen.getByText('No sales records match the current filters.'),
    ).toBeVisible();
  });

  it('renders independent list and chart loading states before data resolves', () => {
    const pendingService: SalesHistoryService = {
      listSalesHistory: () => new Promise(() => undefined),
      getSalesTrend: () => new Promise(() => undefined),
    };
    render(<SalesHistoryView service={pendingService} />);

    expect(screen.getByRole('status', { name: 'Loading sales history' })).toBeVisible();
    expect(
      screen.getByRole('status', { name: 'Loading sales quantity trend' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('table', { name: 'Sales history' }),
    ).not.toBeInTheDocument();
  });

  it('keeps an available table visible when the independent chart request fails safely', async () => {
    const service: SalesHistoryService = {
      listSalesHistory: () =>
        Promise.resolve(pageFor(SALES_HISTORY_TRANSACTIONS_FIXTURE)),
      getSalesTrend: () =>
        Promise.reject(
          new SalesHistoryServiceError(
            'sales_history_unavailable',
            'Unable to load sales chart.',
          ),
        ),
    };
    render(<SalesHistoryView service={service} />);

    expect(await screen.findByRole('table', { name: 'Sales history' })).toBeVisible();
    expect(await screen.findByText('Unable to load sales chart.')).toBeVisible();
  });

  it('normalizes unexpected list errors without exposing service internals', async () => {
    const service: SalesHistoryService = {
      listSalesHistory: () => Promise.reject(new Error('database connection details')),
      getSalesTrend: () => Promise.resolve(SALES_HISTORY_TRENDS_FIXTURE),
    };
    render(<SalesHistoryView service={service} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load sales history.',
    );
    expect(screen.queryByText('database connection details')).not.toBeInTheDocument();
  });
});
