import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductServiceError,
  createUnavailableProductService,
  type ProductService,
} from '@/features/products/api';
import { ProductForm } from '@/features/products/components/product-form';
import { ProductStatusBadge } from '@/features/products/components/product-status-badge';
import { ProductsTable } from '@/features/products/components/products-table';
import { ProductsView } from '@/features/products/components/products-view';
import { PRODUCTS_FIXTURE } from '@/tests/fixtures/products';
import { createQueryClient } from '@/lib/query-client';

const CATEGORY_FIXTURE = {
  id: 'category-1',
  name: 'Cables',
  description: 'Connectivity products',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as const;

function renderProductsView(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>,
  );
}

function serviceFor(
  listProducts: Awaited<ReturnType<ProductService['listProducts']>>,
): ProductService {
  return {
    ...createUnavailableProductService(),
    listProducts: vi.fn((filters) => {
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
    }),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
  };
}

function integratedService(overrides: Partial<ProductService> = {}): ProductService {
  return {
    ...serviceFor(PRODUCTS_FIXTURE),
    getProduct: (productId) => {
      const product = PRODUCTS_FIXTURE.products.find((item) => item.id === productId);
      return product === undefined
        ? Promise.reject(
            new ProductServiceError('product_not_found', 'Product not found.'),
          )
        : Promise.resolve(product);
    },
    archiveProduct: vi.fn().mockResolvedValue(undefined),
    listCategories: vi.fn().mockResolvedValue({
      categories: [CATEGORY_FIXTURE],
      total: 1,
      limit: 200,
      offset: 0,
    }),
    createCategory: vi.fn().mockResolvedValue(CATEGORY_FIXTURE),
    updateCategory: vi.fn().mockResolvedValue(CATEGORY_FIXTURE),
    archiveCategory: vi.fn().mockResolvedValue(undefined),
    listUnits: vi.fn().mockResolvedValue(['pcs', 'kg', 'liter']),
    ...overrides,
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
        categoryId: null,
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
      categoryId: null,
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

  it('uses backend-provided category and unit options for Product form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductForm
        mode="create"
        categories={[CATEGORY_FIXTURE]}
        units={['liter']}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('option', { name: 'Cables' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'liter' })).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Category'), 'category-1');
    await user.type(screen.getByLabelText(/^Name/), 'Milk');
    await user.type(screen.getByLabelText(/^SKU/), 'MILK-1');
    await user.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'category-1', unit: 'liter' }),
      ),
    );
  });
});

describe('Product list components', () => {
  it('renders table semantics, safe price fallback, status text, and edit actions', () => {
    render(
      <ProductsTable
        products={PRODUCTS_FIXTURE.products}
        onEdit={vi.fn()}
        onView={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

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
      ...createUnavailableProductService(),
      listProducts: () => new Promise(() => undefined),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
    };
    const { unmount } = renderProductsView(<ProductsView service={pendingService} />);

    expect(screen.getByRole('status', { name: 'Loading products' })).toBeVisible();

    unmount();
    const { unmount: unmountReady } = renderProductsView(
      <ProductsView service={serviceFor(PRODUCTS_FIXTURE)} />,
    );
    expect(await screen.findByRole('table', { name: 'Products' })).toBeVisible();

    await userEvent.type(screen.getByLabelText('Search products'), 'missing');
    expect(await screen.findByText('No products match these filters.')).toBeVisible();

    unmountReady();
    renderProductsView(<ProductsView service={serviceFor(null)} />);
    expect(await screen.findByText('No products available.')).toBeVisible();
  });

  it('normalizes service errors to safe Product Catalog UI messaging', async () => {
    renderProductsView(
      <ProductsView
        service={{
          ...createUnavailableProductService(),
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

  it('renders detail loading, data, a not-found state, and a safe error state', async () => {
    const user = userEvent.setup();
    let resolveDetail!: (product: (typeof PRODUCTS_FIXTURE.products)[number]) => void;
    const successfulService = integratedService({
      getProduct: () =>
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
    });
    const { unmount } = renderProductsView(
      <ProductsView service={successfulService} />,
    );
    await screen.findByRole('table', { name: 'Products' });
    await user.click(screen.getByRole('button', { name: 'View Widget Cable' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading product details...');
    resolveDetail(PRODUCTS_FIXTURE.products[0]!);
    expect(await screen.findByText('WGT-CBL-01')).toBeVisible();
    unmount();

    const notFoundService = integratedService({
      getProduct: () =>
        Promise.reject(
          new ProductServiceError('product_not_found', 'Product not found.'),
        ),
    });
    const { unmount: unmountNotFound } = renderProductsView(
      <ProductsView service={notFoundService} />,
    );
    await screen.findByRole('table', { name: 'Products' });
    await user.click(screen.getByRole('button', { name: 'View Widget Cable' }));
    expect(await screen.findByText('Product not found.')).toBeVisible();
    unmountNotFound();

    const failedService = integratedService({
      getProduct: () => Promise.reject(new Error('database connection failed')),
    });
    renderProductsView(<ProductsView service={failedService} />);
    await screen.findByRole('table', { name: 'Products' });
    await user.click(screen.getByRole('button', { name: 'View Widget Cable' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load product details.',
    );
    expect(screen.queryByText('database connection failed')).not.toBeInTheDocument();
  });

  it('confirms product archive, refreshes Product queries, and safely presents failures', async () => {
    const user = userEvent.setup();
    const archiveProduct = vi.fn().mockResolvedValue(undefined);
    const successService = integratedService({ archiveProduct });
    const { unmount } = renderProductsView(<ProductsView service={successService} />);
    await screen.findByRole('table', { name: 'Products' });
    await user.click(screen.getByRole('button', { name: 'Archive Widget Cable' }));
    expect(screen.getByText(/Archive Widget Cable\?/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Archive product' }));
    await waitFor(() => expect(archiveProduct).toHaveBeenCalledWith('product-cable-1'));
    await waitFor(() => expect(successService.listProducts).toHaveBeenCalledTimes(2));
    unmount();

    const failedService = integratedService({
      archiveProduct: vi
        .fn()
        .mockRejectedValue(new Error('database connection failed')),
    });
    renderProductsView(<ProductsView service={failedService} />);
    await screen.findByRole('table', { name: 'Products' });
    await user.click(screen.getByRole('button', { name: 'Archive Widget Cable' }));
    await user.click(screen.getByRole('button', { name: 'Archive product' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to archive the product.',
    );
    expect(screen.queryByText('database connection failed')).not.toBeInTheDocument();
  });

  it('lists, creates, updates, and confirms category archive actions', async () => {
    const user = userEvent.setup();
    const createCategory = vi.fn().mockResolvedValue(CATEGORY_FIXTURE);
    const updateCategory = vi.fn().mockResolvedValue(CATEGORY_FIXTURE);
    const archiveCategory = vi.fn().mockResolvedValue(undefined);
    const service = integratedService({
      createCategory,
      updateCategory,
      archiveCategory,
    });
    renderProductsView(<ProductsView service={service} />);
    await screen.findByRole('table', { name: 'Products' });
    await user.click(screen.getByRole('button', { name: 'Manage categories' }));
    expect(await screen.findByText('Cables')).toBeVisible();

    await user.clear(screen.getByLabelText('Category name'));
    await user.type(screen.getByLabelText('Category name'), 'Dairy');
    await user.click(screen.getByRole('button', { name: 'Create category' }));
    await waitFor(() =>
      expect(createCategory).toHaveBeenCalledWith({ name: 'Dairy', description: null }),
    );

    await user.click(screen.getByRole('button', { name: 'Edit Cables' }));
    await user.clear(screen.getByLabelText('Category name'));
    await user.type(screen.getByLabelText('Category name'), 'Fresh Cables');
    await user.click(screen.getByRole('button', { name: 'Save category' }));
    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith('category-1', {
        name: 'Fresh Cables',
        description: 'Connectivity products',
        isActive: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Archive Cables' }));
    expect(screen.getByLabelText('Archive category confirmation')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Archive category' }));
    await waitFor(() => expect(archiveCategory).toHaveBeenCalledWith('category-1'));
  });
});
