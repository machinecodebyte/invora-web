'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/hooks/use-toast';
import type { ProductService } from '@/features/products/api';
import { ProductForm } from '@/features/products/components/product-form';
import { ProductsSkeleton } from '@/features/products/components/products-skeleton';
import { ProductsTable } from '@/features/products/components/products-table';
import { ProductsToolbar } from '@/features/products/components/products-toolbar';
import { useProducts } from '@/features/products/hooks';
import type {
  Product,
  ProductCreateData,
  ProductUpdateData,
} from '@/features/products/types';

type ProductDialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly product: Product }
  | null;

export interface ProductsViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  service?: ProductService;
}

/** Product Catalog composition with explicit data, mutation, and modal states. */
export function ProductsView({ service }: ProductsViewProps) {
  const {
    state,
    filters,
    pendingAction,
    setFilters,
    reload,
    createProduct,
    updateProduct,
  } = useProducts(service);
  const { toast } = useToast();
  const [dialog, setDialog] = useState<ProductDialogState>(null);
  const hasFilters = filters.search !== '' || filters.status !== 'all';

  const closeDialog = (): void => {
    setDialog(null);
  };

  const onCreate = async (input: ProductCreateData): Promise<void> => {
    await createProduct(input);
    toast({
      title: 'Product created',
      description: 'The product was added to the test catalog.',
      variant: 'success',
    });
    closeDialog();
  };

  const onUpdate = async (
    product: Product,
    input: ProductUpdateData,
  ): Promise<void> => {
    await updateProduct(product.id, input);
    toast({
      title: 'Product updated',
      description: 'The product changes were saved to the test catalog.',
      variant: 'success',
    });
    closeDialog();
  };

  const content =
    state.status === 'loading' ? (
      <ProductsSkeleton />
    ) : state.status === 'error' ? (
      <ErrorState
        title={state.message}
        description="Please try again. If the problem continues, contact your administrator."
        onRetry={reload}
      />
    ) : state.status === 'empty' ? (
      <EmptyState
        title="No products available."
        description="Products will appear here once Product Catalog data is available."
        action={
          <Button onClick={() => setDialog({ mode: 'create' })}>Add product</Button>
        }
      />
    ) : state.data.products.length === 0 && hasFilters ? (
      <EmptyState
        title="No products match these filters."
        description="Try another search or status filter."
        action={
          <Button
            variant="secondary"
            onClick={() => setFilters({ search: '', status: 'all' })}
          >
            Clear filters
          </Button>
        }
      />
    ) : state.data.products.length === 0 ? (
      <EmptyState
        title="No products available."
        description="Products will appear here once Product Catalog data is available."
        action={
          <Button onClick={() => setDialog({ mode: 'create' })}>Add product</Button>
        }
      />
    ) : (
      <ProductsTable
        products={state.data.products}
        onEdit={(product) => setDialog({ mode: 'edit', product })}
      />
    );

  return (
    <>
      <div className="min-w-0 space-y-6">
        <ProductsToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onAddProduct={() => setDialog({ mode: 'create' })}
        />
        {content}
        {state.status === 'ready' && !hasFilters ? (
          <p className="text-sm text-foreground-muted">
            {state.data.total} product{state.data.total === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      {dialog === null ? null : (
        <Dialog
          open
          title={dialog.mode === 'create' ? 'Add product' : 'Edit product'}
          onClose={closeDialog}
        >
          {dialog.mode === 'create' ? (
            <ProductForm
              key="create"
              mode="create"
              isSubmitting={pendingAction === 'create'}
              onCancel={closeDialog}
              onSubmit={onCreate}
            />
          ) : (
            <ProductForm
              key={dialog.product.id}
              mode="edit"
              product={dialog.product}
              isSubmitting={pendingAction === 'update'}
              onCancel={closeDialog}
              onSubmit={(input) => onUpdate(dialog.product, input)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
