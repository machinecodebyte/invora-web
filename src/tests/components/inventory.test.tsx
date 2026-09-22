import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InventoryServiceError, type InventoryService } from '@/features/inventory/api';
import { InventoryStatusBadge } from '@/features/inventory/components/inventory-status-badge';
import { InventoryTable } from '@/features/inventory/components/inventory-table';
import { InventoryView } from '@/features/inventory/components/inventory-view';
import { StockUpdateForm } from '@/features/inventory/components/stock-update-form';
import type { InventoryListResult } from '@/features/inventory/types';
import {
  EMPTY_INVENTORY_FIXTURE,
  INVENTORY_FIXTURE,
  LOW_STOCK_INVENTORY_FIXTURE,
} from '@/tests/fixtures/inventory';
import { createQueryClient } from '@/lib/query-client';

function renderInventoryView(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>,
  );
}

function applyFilters(
  source: InventoryListResult,
  filters: Parameters<InventoryService['listInventory']>[0],
): InventoryListResult {
  const query = filters.search.trim().toLocaleLowerCase();
  const items = source.items.filter((item) => {
    const matchesSearch =
      query === '' ||
      item.product.name.toLocaleLowerCase().includes(query) ||
      item.product.sku.toLocaleLowerCase().includes(query);
    return (
      matchesSearch && (filters.status === 'all' || item.stockStatus === filters.status)
    );
  });
  return { ...source, items, total: items.length };
}

function serviceFor(data: InventoryListResult | null): InventoryService {
  return {
    listInventory: (filters) =>
      Promise.resolve(data === null ? null : applyFilters(data, filters)),
    listLowStock: (filters) =>
      Promise.resolve(
        data === null ? null : applyFilters(LOW_STOCK_INVENTORY_FIXTURE, filters),
      ),
    createStockMovement: vi.fn().mockResolvedValue({
      productId: 'product-cable-1',
      quantityAfter: 27,
    }),
  };
}

describe('StockUpdateForm', () => {
  it('renders accessible fields and validates the stock movement contract', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <StockUpdateForm
        item={INVENTORY_FIXTURE.items[0]!}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText(/^Movement type/)).toBeRequired();
    expect(screen.getByLabelText(/^Quantity/)).toBeRequired();
    expect(screen.getByLabelText('Reason')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Update stock' }));
    expect(await screen.findByText('Quantity is required.')).toBeVisible();

    await user.selectOptions(screen.getByLabelText(/^Movement type/), 'correction');
    await user.type(screen.getByLabelText(/^Quantity/), '-1.250');
    await user.type(screen.getByLabelText('Reason'), '  Count correction ');
    await user.click(screen.getByRole('button', { name: 'Update stock' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        productId: 'product-cable-1',
        movementType: 'correction',
        quantity: '-1.250',
        reason: 'Count correction',
      }),
    );
  });

  it('shows a safe stock update failure and disables duplicate pending input', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <StockUpdateForm
        item={INVENTORY_FIXTURE.items[0]!}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={() => Promise.reject(new Error('database details'))}
      />,
    );
    await user.type(screen.getByLabelText(/^Quantity/), '2');
    await user.click(screen.getByRole('button', { name: 'Update stock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update stock.',
    );
    expect(screen.queryByText('database details')).not.toBeInTheDocument();

    unmount();
    render(
      <StockUpdateForm
        item={INVENTORY_FIXTURE.items[0]!}
        isSubmitting
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/^Quantity/)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Update stock$/ })).toBeDisabled();
  });
});

describe('Inventory list components', () => {
  it('renders readable stock fields, status text, and stock update actions', () => {
    render(<InventoryTable items={INVENTORY_FIXTURE.items} onUpdateStock={vi.fn()} />);

    expect(screen.getByRole('table', { name: 'Inventory' })).toBeVisible();
    expect(screen.getByText('Widget Zero')).toBeVisible();
    expect(screen.getByText('0 pcs')).toBeVisible();
    expect(screen.getByText('Low stock')).toBeVisible();
    expect(screen.getByText('Out of stock')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Update stock for Widget Cable' }),
    ).toBeVisible();
  });

  it('renders status as text instead of color alone', () => {
    render(<InventoryStatusBadge status="low_stock" />);
    expect(screen.getByText('Low stock')).toBeVisible();
  });
});

describe('InventoryView', () => {
  it('renders loading, ready, filtered empty, low-stock empty, and successful empty states', async () => {
    const pendingService: InventoryService = {
      listInventory: () => new Promise(() => undefined),
      listLowStock: () => new Promise(() => undefined),
      createStockMovement: vi.fn(),
    };
    const { unmount } = renderInventoryView(<InventoryView service={pendingService} />);
    expect(screen.getByRole('status', { name: 'Loading inventory' })).toBeVisible();

    unmount();
    const readyView = renderInventoryView(
      <InventoryView service={serviceFor(INVENTORY_FIXTURE)} />,
    );
    expect(await screen.findByRole('table', { name: 'Inventory' })).toBeVisible();

    await userEvent.type(screen.getByLabelText('Search inventory'), 'missing');
    expect(
      await screen.findByText('No inventory records match these filters.'),
    ).toBeVisible();

    await userEvent.clear(screen.getByLabelText('Search inventory'));
    await userEvent.selectOptions(screen.getByLabelText('Inventory view'), 'low_stock');
    expect(await screen.findByText('Widget Powder')).toBeVisible();

    readyView.unmount();
    const lowStockEmptyView = renderInventoryView(
      <InventoryView service={serviceFor(null)} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Inventory view'), 'low_stock');
    expect(await screen.findByText('No low-stock items available.')).toBeVisible();

    lowStockEmptyView.unmount();
    renderInventoryView(<InventoryView service={serviceFor(null)} />);
    expect(await screen.findByText('No inventory records available.')).toBeVisible();
  });

  it('normalizes Inventory service errors to safe UI messaging', async () => {
    renderInventoryView(
      <InventoryView
        service={{
          listInventory: () =>
            Promise.reject(
              new InventoryServiceError(
                'inventory_unavailable',
                'Unable to load inventory.',
              ),
            ),
          listLowStock: () => Promise.resolve(EMPTY_INVENTORY_FIXTURE),
          createStockMovement: vi.fn(),
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load inventory.',
    );
  });

  it('reconciles Inventory data by invalidating only Inventory queries after a movement', async () => {
    const user = userEvent.setup();
    const listInventory = vi.fn().mockResolvedValue(INVENTORY_FIXTURE);
    const createStockMovement = vi.fn().mockResolvedValue({
      productId: 'product-cable-1',
      quantityAfter: 27,
    });
    renderInventoryView(
      <InventoryView
        service={{
          listInventory,
          listLowStock: vi.fn().mockResolvedValue(LOW_STOCK_INVENTORY_FIXTURE),
          createStockMovement,
        }}
      />,
    );

    await screen.findByRole('table', { name: 'Inventory' });
    await user.click(
      screen.getByRole('button', { name: 'Update stock for Widget Cable' }),
    );
    await user.type(screen.getByLabelText(/^Quantity/), '3');
    await user.click(screen.getByRole('button', { name: 'Update stock' }));

    await waitFor(() => expect(createStockMovement).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listInventory).toHaveBeenCalledTimes(2));
  });
});
