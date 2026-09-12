'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type {
  ProductFilterStatus,
  ProductListFilters,
} from '@/features/products/types';

export interface ProductsToolbarProps {
  filters: ProductListFilters;
  onFiltersChange: (filters: ProductListFilters) => void;
  onAddProduct: () => void;
}

/** Search, backend-aligned status filter, and create entry point. */
export function ProductsToolbar({
  filters,
  onFiltersChange,
  onAddProduct,
}: ProductsToolbarProps) {
  const hasActiveFilters = filters.search !== '' || filters.status !== 'all';

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Label htmlFor="product-search">Search products</Label>
        <Input
          id="product-search"
          type="search"
          placeholder="Search name or SKU"
          value={filters.search}
          onChange={(event) =>
            onFiltersChange({ ...filters, search: event.target.value })
          }
          className="mt-1.5"
        />
      </div>
      <div className="w-full sm:w-40">
        <Label htmlFor="product-status-filter">Status</Label>
        <Select
          id="product-status-filter"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as ProductFilterStatus,
            })
          }
          className="mt-1.5"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      {hasActiveFilters ? (
        <Button
          variant="ghost"
          onClick={() => onFiltersChange({ search: '', status: 'all' })}
        >
          Clear filters
        </Button>
      ) : null}
      <Button onClick={onAddProduct}>Add product</Button>
    </div>
  );
}
