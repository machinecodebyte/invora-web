'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import { toDisplayMessage } from '@/lib/api-error';
import {
  AUTHENTICATED_QUERY_META_KEY,
  AUTHENTICATED_QUERY_META_VALUE,
} from '@/lib/query-client';

const DEFAULT_FILTERS: InventoryListFilters = {
  search: '',
  status: 'all',
  view: 'all',
};
const GENERIC_INVENTORY_ERROR = 'Unable to load inventory.';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  list: (filters: InventoryListFilters) =>
    ['inventory', 'list', filters.view, filters.search.trim(), filters.status] as const,
};

function toSafeErrorMessage(error: unknown): string {
  return error instanceof InventoryServiceError
    ? error.message
    : toDisplayMessage(error, GENERIC_INVENTORY_ERROR);
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
 * It keeps Inventory server state separate from Auth and reconciles movement
 * writes by invalidating only Inventory-scoped data.
 */
export function useInventory(
  service: InventoryService = inventoryService,
): UseInventoryResult {
  const [filters, setFiltersState] = useState<InventoryListFilters>(DEFAULT_FILTERS);
  const queryClient = useQueryClient();
  const inventoryQuery = useQuery({
    queryKey: inventoryQueryKeys.list(filters),
    queryFn: () =>
      filters.view === 'low_stock'
        ? service.listLowStock(filters)
        : service.listInventory(filters),
    meta: {
      [AUTHENTICATED_QUERY_META_KEY]: AUTHENTICATED_QUERY_META_VALUE,
    },
  });
  const invalidateInventory = useCallback(
    () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all }),
    [queryClient],
  );
  const movementMutation = useMutation({
    mutationFn: (input: StockMovementData) => service.createStockMovement(input),
    onSuccess: invalidateInventory,
  });
  const state: InventoryViewState = inventoryQuery.isPending
    ? { status: 'loading' }
    : inventoryQuery.isError
      ? { status: 'error', message: toSafeErrorMessage(inventoryQuery.error) }
      : inventoryQuery.data === null || inventoryQuery.data === undefined
        ? { status: 'empty' }
        : { status: 'ready', data: inventoryQuery.data };
  const pendingAction: InventoryPendingAction = movementMutation.isPending
    ? 'stock_update'
    : null;

  const reload = useCallback(() => {
    void inventoryQuery.refetch();
  }, [inventoryQuery]);

  const setFilters = useCallback((nextFilters: InventoryListFilters) => {
    setFiltersState(nextFilters);
  }, []);

  const createStockMovement = useCallback(
    async (input: StockMovementData): Promise<StockMovementResult> => {
      return movementMutation.mutateAsync(input);
    },
    [movementMutation],
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
