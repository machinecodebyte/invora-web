'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type {
  InventoryFilterStatus,
  InventoryListFilters,
  InventoryView,
} from '@/features/inventory/types';

export interface InventoryToolbarProps {
  filters: InventoryListFilters;
  onFiltersChange: (filters: InventoryListFilters) => void;
}

/** Backend-aligned inventory search, status, and dedicated low-stock view controls. */
export function InventoryToolbar({ filters, onFiltersChange }: InventoryToolbarProps) {
  const hasActiveFilters = filters.search !== '' || filters.status !== 'all';

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1">
        <Label htmlFor="inventory-search">Search inventory</Label>
        <Input
          id="inventory-search"
          type="search"
          placeholder="Search product name or SKU"
          value={filters.search}
          onChange={(event) =>
            onFiltersChange({ ...filters, search: event.target.value })
          }
          className="mt-1.5"
        />
      </div>
      <div className="w-full lg:w-44">
        <Label htmlFor="inventory-view-filter">Inventory view</Label>
        <Select
          id="inventory-view-filter"
          value={filters.view}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              view: event.target.value as InventoryView,
            })
          }
          className="mt-1.5"
        >
          <option value="all">All inventory</option>
          <option value="low_stock">Low stock</option>
        </Select>
      </div>
      <div className="w-full lg:w-44">
        <Label htmlFor="inventory-status-filter">Stock status</Label>
        <Select
          id="inventory-status-filter"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as InventoryFilterStatus,
            })
          }
          className="mt-1.5"
        >
          <option value="all">All statuses</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button
          variant="ghost"
          onClick={() => onFiltersChange({ ...filters, search: '', status: 'all' })}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
