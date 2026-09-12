'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/hooks/use-toast';
import type { InventoryService } from '@/features/inventory/api';
import { InventorySkeleton } from '@/features/inventory/components/inventory-skeleton';
import { InventoryTable } from '@/features/inventory/components/inventory-table';
import { InventoryToolbar } from '@/features/inventory/components/inventory-toolbar';
import { StockUpdateForm } from '@/features/inventory/components/stock-update-form';
import { useInventory } from '@/features/inventory/hooks';
import type { InventoryItem, StockMovementData } from '@/features/inventory/types';

export interface InventoryViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  service?: InventoryService;
}

/** Inventory composition with explicit data, immutable movement, and dialog states. */
export function InventoryView({ service }: InventoryViewProps) {
  const { state, filters, pendingAction, setFilters, reload, createStockMovement } =
    useInventory(service);
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const hasFilters = filters.search !== '' || filters.status !== 'all';
  const lowStockView = filters.view === 'low_stock';

  const closeDialog = (): void => {
    setSelectedItem(null);
  };

  const onStockUpdate = async (input: StockMovementData): Promise<void> => {
    await createStockMovement(input);
    toast({
      title: 'Stock update recorded',
      description: 'The stock movement was recorded.',
      variant: 'success',
    });
    closeDialog();
  };

  const noInventoryTitle = lowStockView
    ? 'No low-stock items available.'
    : 'No inventory records available.';
  const noInventoryDescription = lowStockView
    ? 'Items at or below their minimum stock will appear here.'
    : 'Inventory records will appear here once Inventory data is available.';

  const content =
    state.status === 'loading' ? (
      <InventorySkeleton />
    ) : state.status === 'error' ? (
      <ErrorState
        title={state.message}
        description="Please try again. If the problem continues, contact your administrator."
        onRetry={reload}
      />
    ) : state.status === 'empty' ? (
      <EmptyState title={noInventoryTitle} description={noInventoryDescription} />
    ) : state.data.items.length === 0 && hasFilters ? (
      <EmptyState
        title="No inventory records match these filters."
        description="Try another search or stock-status filter."
        action={
          <Button
            variant="secondary"
            onClick={() => setFilters({ ...filters, search: '', status: 'all' })}
          >
            Clear filters
          </Button>
        }
      />
    ) : state.data.items.length === 0 ? (
      <EmptyState title={noInventoryTitle} description={noInventoryDescription} />
    ) : (
      <InventoryTable items={state.data.items} onUpdateStock={setSelectedItem} />
    );

  return (
    <>
      <div className="min-w-0 space-y-6">
        <InventoryToolbar filters={filters} onFiltersChange={setFilters} />
        {content}
        {state.status === 'ready' && !hasFilters ? (
          <p className="text-sm text-foreground-muted">
            {state.data.total} inventory record{state.data.total === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      {selectedItem === null ? null : (
        <Dialog open title="Update stock" onClose={closeDialog}>
          <StockUpdateForm
            key={selectedItem.id}
            item={selectedItem}
            isSubmitting={pendingAction === 'stock_update'}
            onCancel={closeDialog}
            onSubmit={onStockUpdate}
          />
        </Dialog>
      )}
    </>
  );
}
