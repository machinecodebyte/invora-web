'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  InventoryServiceError,
  inventoryService,
  type InventoryService,
} from '@/features/inventory/api';
import type {
  InventoryListFilters,
  InventoryPendingAction,
  InventoryViewState,
  StockMovementData,
  StockMovementResult,
} from '@/features/inventory/types';

const DEFAULT_FILTERS: InventoryListFilters = {
  search: '',
  status: 'all',
  view: 'all',
};
const GENERIC_INVENTORY_ERROR = 'Unable to load inventory.';

function toSafeErrorMessage(error: unknown): string {
  return error instanceof InventoryServiceError
    ? error.message
    : GENERIC_INVENTORY_ERROR;
}

export interface UseInventoryResult {
  readonly state: InventoryViewState;
  readonly filters: InventoryListFilters;
  readonly pendingAction: InventoryPendingAction;
  setFilters: (filters: InventoryListFilters) => void;
  reload: () => void;
  createStockMovement: (input: StockMovementData) => Promise<StockMovementResult>;
}

/**
 * Inventory list and immutable stock-movement orchestration.
 *
 * It keeps server state separate from Auth and makes no request before the
 * future Inventory service adapter is enabled.
 */
export function useInventory(
  service: InventoryService = inventoryService,
): UseInventoryResult {
  const [filters, setFiltersState] = useState<InventoryListFilters>(DEFAULT_FILTERS);
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<InventoryViewState>({ status: 'loading' });
  const [pendingAction, setPendingAction] = useState<InventoryPendingAction>(null);

  useEffect(() => {
    let active = true;
    const request =
      filters.view === 'low_stock'
        ? service.listLowStock(filters)
        : service.listInventory(filters);

    void request
      .then((data) => {
        if (!active) {
          return;
        }
        setState(data === null ? { status: 'empty' } : { status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: 'error', message: toSafeErrorMessage(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [filters, requestVersion, service]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, []);

  const setFilters = useCallback((nextFilters: InventoryListFilters) => {
    setState({ status: 'loading' });
    setFiltersState(nextFilters);
  }, []);

  const createStockMovement = useCallback(
    async (input: StockMovementData): Promise<StockMovementResult> => {
      setPendingAction('stock_update');
      try {
        const result = await service.createStockMovement(input);
        reload();
        return result;
      } finally {
        setPendingAction(null);
      }
    },
    [reload, service],
  );

  return {
    state,
    filters,
    pendingAction,
    setFilters,
    reload,
    createStockMovement,
  };
}
