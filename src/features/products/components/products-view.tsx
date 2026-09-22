'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProductServiceError, type ProductService } from '@/features/products/api';
import { CategoryManager } from '@/features/products/components/category-manager';
import { ProductForm } from '@/features/products/components/product-form';
import { ProductsSkeleton } from '@/features/products/components/products-skeleton';
import { ProductsTable } from '@/features/products/components/products-table';
import { ProductsToolbar } from '@/features/products/components/products-toolbar';
import {
  useProductCatalogExtensions,
  useProductDetail,
  useProducts,
} from '@/features/products/hooks';
import type {
  Product,
  ProductCreateData,
  ProductUpdateData,
} from '@/features/products/types';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api-error';

type ProductDialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly product: Product }
  | { readonly mode: 'detail'; readonly productId: string }
  | { readonly mode: 'archive'; readonly product: Product }
  | { readonly mode: 'categories' }
  | null;

export interface ProductsViewProps {
  /** Dependency-injection seam for component tests and the HTTP adapter. */
  service?: ProductService;
}

function isNotFoundError(error: unknown): boolean {
  return (
    (isApiError(error) && error.status === 404) ||
    (error instanceof ProductServiceError && error.code === 'product_not_found')
  );
}

/** Product Catalog composition with explicit data, mutation, and modal states. */
export function ProductsView({ service }: ProductsViewProps) {
  const [dialog, setDialog] = useState<ProductDialogState>(null);
  const {
    state,
    filters,
    pendingAction,
    setFilters,
    reload,
    createProduct,
    updateProduct,
  } = useProducts(service);
  const extensions = useProductCatalogExtensions(service);
  const detail = useProductDetail(
    dialog?.mode === 'detail' ? dialog.productId : null,
    service,
  );
  const { toast } = useToast();
  const hasFilters = filters.search !== '' || filters.status !== 'all';
  const categories = extensions.categories.data?.categories ?? [];
  const units = extensions.units.data ?? [];

  const closeDialog = (): void => {
    setDialog(null);
  };

  const onCreate = async (input: ProductCreateData): Promise<void> => {
    await createProduct(input);
    toast({
      title: 'Product created',
      description: 'The product was added to your catalog.',
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
      description: 'The product changes were saved to your catalog.',
      variant: 'success',
    });
    closeDialog();
  };

  const onArchiveProduct = async (productId: string): Promise<void> => {
    try {
      await extensions.archiveProduct.mutateAsync(productId);
      toast({ title: 'Product archived', variant: 'success' });
      closeDialog();
    } catch {
      // The safe presentation error below is intentionally the only output.
    }
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
        onView={(product) => setDialog({ mode: 'detail', productId: product.id })}
        onArchive={(product) => setDialog({ mode: 'archive', product })}
      />
    );

  const formContent = extensions.units.isPending ? (
    <p role="status">Loading allowed product units...</p>
  ) : extensions.units.isError ? (
    <p role="alert">Unable to load product units.</p>
  ) : units.length === 0 ? (
    <p role="alert">No product units are available.</p>
  ) : dialog?.mode === 'create' ? (
    <ProductForm
      key="create"
      mode="create"
      isSubmitting={pendingAction === 'create'}
      categories={categories}
      units={units}
      onCancel={closeDialog}
      onSubmit={onCreate}
    />
  ) : dialog?.mode === 'edit' ? (
    <ProductForm
      key={dialog.product.id}
      mode="edit"
      product={dialog.product}
      isSubmitting={pendingAction === 'update'}
      categories={categories}
      units={units}
      onCancel={closeDialog}
      onSubmit={(input) => onUpdate(dialog.product, input)}
    />
  ) : null;

  return (
    <>
      <div className="min-w-0 space-y-6">
        <ProductsToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onAddProduct={() => setDialog({ mode: 'create' })}
        />
        <Button variant="secondary" onClick={() => setDialog({ mode: 'categories' })}>
          Manage categories
        </Button>
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
          title={
            dialog.mode === 'create'
              ? 'Add product'
              : dialog.mode === 'edit'
                ? 'Edit product'
                : dialog.mode === 'detail'
                  ? 'Product details'
                  : dialog.mode === 'archive'
                    ? 'Archive product'
                    : 'Manage categories'
          }
          onClose={closeDialog}
        >
          {dialog.mode === 'create' || dialog.mode === 'edit' ? formContent : null}

          {dialog.mode === 'detail' ? (
            detail.isPending ? (
              <p role="status">Loading product details...</p>
            ) : detail.isError ? (
              isNotFoundError(detail.error) ? (
                <p>Product not found.</p>
              ) : (
                <p role="alert">Unable to load product details.</p>
              )
            ) : detail.data === undefined ? (
              <p>Product not found.</p>
            ) : (
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-foreground-muted">SKU</dt>
                  <dd>{detail.data.sku}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Description</dt>
                  <dd>{detail.data.description ?? 'Unavailable'}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Unit</dt>
                  <dd>{detail.data.unit}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Status</dt>
                  <dd>{detail.data.isActive ? 'Active' : 'Archived'}</dd>
                </div>
              </dl>
            )
          ) : null}

          {dialog.mode === 'archive' ? (
            <div className="space-y-4">
              <p>
                Archive {dialog.product.name}? It will remain in the catalog as
                inactive.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isLoading={extensions.archiveProduct.isPending}
                  onClick={() => void onArchiveProduct(dialog.product.id)}
                >
                  Archive product
                </Button>
              </div>
              {extensions.archiveProduct.isError ? (
                <p role="alert">Unable to archive the product.</p>
              ) : null}
            </div>
          ) : null}

          {dialog.mode === 'categories' ? (
            <CategoryManager {...(service === undefined ? {} : { service })} />
          ) : null}
        </Dialog>
      )}
    </>
  );
}
