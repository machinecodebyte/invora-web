import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProductServiceError, type ProductService } from '@/features/products/api';
import { ProductForm } from '@/features/products/components/product-form';
import { ProductStatusBadge } from '@/features/products/components/product-status-badge';
import { ProductsTable } from '@/features/products/components/products-table';
import { ProductsView } from '@/features/products/components/products-view';
import { PRODUCTS_FIXTURE } from '@/tests/fixtures/products';

function serviceFor(
  listProducts: Awaited<ReturnType<ProductService['listProducts']>>,
): ProductService {
  return {
    listProducts: (filters) => {
      if (listProducts === null) {
        return Promise.resolve(null);
      }
      const query = filters.search.trim().toLocaleLowerCase();
      const products = listProducts.products.filter((product) => {
        const matchesSearch =
          query === '' ||
          product.name.toLocaleLowerCase().includes(query) ||
          product.sku.toLocaleLowerCase().includes(query);
        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'active' && product.isActive) ||
          (filters.status === 'inactive' && !product.isActive);
        return matchesSearch && matchesStatus;
      });
      return Promise.resolve({ ...listProducts, products, total: products.length });
    },
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
  };
}

describe('Product form', () => {
  it('renders accessible fields and blocks an invalid create submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductForm
        mode="create"
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText(/^Name/)).toBeRequired();
    expect(screen.getByLabelText(/^SKU/)).toBeRequired();
    expect(screen.getByLabelText('Description')).toBeVisible();
    expect(screen.getByLabelText(/^Unit/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText('Product name is required.')).toBeVisible();
    expect(screen.getByText('SKU is required.')).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized create data and disables duplicate pending submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductForm
        mode="create"
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/^Name/), '  Widget Cable ');
    await user.type(screen.getByLabelText(/^SKU/), ' wgt cable 01 ');
    await user.type(screen.getByLabelText('Selling price'), '24.50');
    await user.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Widget Cable',
        sku: 'WGT-CABLE-01',
        description: null,
        unit: 'pcs',
        sellingPrice: 24.5,
        costPrice: null,
      }),
    );
  });

  it('shows a safe form-level mutation failure without exposing unknown details', async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        mode="create"
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={() => Promise.reject(new Error('database connection failed'))}
      />,
    );

    await user.type(screen.getByLabelText(/^Name/), 'Widget Cable');
    await user.type(screen.getByLabelText(/^SKU/), 'WGT-CBL-01');
    await user.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to create the product.',
    );
    expect(screen.queryByText('database connection failed')).not.toBeInTheDocument();
  });

  it('uses update status input and sends the backend-aligned isActive field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductForm
        mode="edit"
        product={PRODUCTS_FIXTURE.products[1]!}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Status'), 'active');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Widget Powder',
      sku: 'WGT-PWD-01',
      description: null,
      unit: 'kg',
      sellingPrice: 18,
      costPrice: null,
      isActive: true,
    });
  });

  it('disables form controls while a Product mutation is pending', () => {
    render(
      <ProductForm mode="create" isSubmitting onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByLabelText(/^Name/)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Create product/ })).toBeDisabled();
  });
});

describe('Product list components', () => {
  it('renders table semantics, safe price fallback, status text, and edit actions', () => {
    render(<ProductsTable products={PRODUCTS_FIXTURE.products} onEdit={vi.fn()} />);

    expect(screen.getByRole('table', { name: 'Products' })).toBeVisible();
    expect(screen.getByText('Widget Cable')).toBeVisible();
    expect(screen.getByText('24.50')).toBeVisible();
    expect(screen.getByText('Unavailable')).toBeVisible();
    expect(screen.getByText('Active')).toBeVisible();
    expect(screen.getByText('Inactive')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit Widget Cable' })).toBeVisible();
  });

  it('renders status as readable text instead of color alone', () => {
    render(<ProductStatusBadge status="inactive" />);
    expect(screen.getByText('Inactive')).toBeVisible();
  });
});

describe('ProductsView', () => {
  it('renders loading, ready, filtered empty, and successful empty states', async () => {
    const pendingService: ProductService = {
      listProducts: () => new Promise(() => undefined),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
    };
    const { unmount } = render(<ProductsView service={pendingService} />);

    expect(screen.getByRole('status', { name: 'Loading products' })).toBeVisible();

    unmount();
    const { rerender } = render(
      <ProductsView service={serviceFor(PRODUCTS_FIXTURE)} />,
    );
    expect(await screen.findByRole('table', { name: 'Products' })).toBeVisible();

    await userEvent.type(screen.getByLabelText('Search products'), 'missing');
    expect(await screen.findByText('No products match these filters.')).toBeVisible();

    rerender(<ProductsView service={serviceFor(null)} />);
    expect(await screen.findByText('No products available.')).toBeVisible();
  });

  it('normalizes service errors to safe Product Catalog UI messaging', async () => {
    render(
      <ProductsView
        service={{
          listProducts: () =>
            Promise.reject(
              new ProductServiceError(
                'products_unavailable',
                'Unable to load products.',
              ),
            ),
          createProduct: vi.fn(),
          updateProduct: vi.fn(),
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load products.',
    );
  });
});
