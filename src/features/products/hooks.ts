'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ProductServiceError,
  productService,
  type ProductService,
} from '@/features/products/api';
import type {
  Product,
  ProductCategoryData,
  ProductCreateData,
  ProductListFilters,
  ProductPendingAction,
  ProductsViewState,
  ProductUpdateData,
} from '@/features/products/types';
import { toDisplayMessage } from '@/lib/api-error';
import {
  AUTHENTICATED_QUERY_META_KEY,
  AUTHENTICATED_QUERY_META_VALUE,
} from '@/lib/query-client';

const DEFAULT_FILTERS: ProductListFilters = { search: '', status: 'all' };
const GENERIC_PRODUCTS_ERROR = 'Unable to load products.';

export const productQueryKeys = {
  all: ['products'] as const,
  list: (filters: ProductListFilters) =>
    ['products', 'list', filters.search.trim(), filters.status] as const,
};

function toSafeErrorMessage(error: unknown): string {
  return error instanceof ProductServiceError
    ? error.message
    : toDisplayMessage(error, GENERIC_PRODUCTS_ERROR);
}

export interface UseProductsResult {
  readonly state: ProductsViewState;
  readonly filters: ProductListFilters;
  readonly pendingAction: ProductPendingAction;
  setFilters: (filters: ProductListFilters) => void;
  reload: () => void;
  createProduct: (input: ProductCreateData) => Promise<Product>;
  updateProduct: (productId: string, input: ProductUpdateData) => Promise<Product>;
}

/**
 * Product Catalog queries and mutations through the ProductService boundary.
 */
export function useProducts(
  service: ProductService = productService,
): UseProductsResult {
  const [filters, setFiltersState] = useState<ProductListFilters>(DEFAULT_FILTERS);
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: productQueryKeys.list(filters),
    queryFn: () => service.listProducts(filters),
    meta: {
      [AUTHENTICATED_QUERY_META_KEY]: AUTHENTICATED_QUERY_META_VALUE,
    },
  });
  const invalidateProducts = useCallback(
    () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
    [queryClient],
  );
  const createMutation = useMutation({
    mutationFn: (input: ProductCreateData) => service.createProduct(input),
    onSuccess: invalidateProducts,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: ProductUpdateData;
    }) => service.updateProduct(productId, input),
    onSuccess: invalidateProducts,
  });

  const state: ProductsViewState = productsQuery.isPending
    ? { status: 'loading' }
    : productsQuery.isError
      ? { status: 'error', message: toSafeErrorMessage(productsQuery.error) }
      : productsQuery.data === null || productsQuery.data === undefined
        ? { status: 'empty' }
        : { status: 'ready', data: productsQuery.data };
  const pendingAction: ProductPendingAction = createMutation.isPending
    ? 'create'
    : updateMutation.isPending
      ? 'update'
      : null;

  const reload = useCallback(() => {
    void productsQuery.refetch();
  }, [productsQuery]);

  const setFilters = useCallback((nextFilters: ProductListFilters) => {
    setFiltersState(nextFilters);
  }, []);

  const createProduct = useCallback(
    async (input: ProductCreateData): Promise<Product> => {
      return createMutation.mutateAsync(input);
    },
    [createMutation],
  );

  const updateProduct = useCallback(
    async (productId: string, input: ProductUpdateData): Promise<Product> => {
      return updateMutation.mutateAsync({ productId, input });
    },
    [updateMutation],
  );

  return {
    state,
    filters,
    pendingAction,
    setFilters,
    reload,
    createProduct,
    updateProduct,
  };
}

export function useProductDetail(
  productId: string | null,
  service: ProductService = productService,
) {
  return useQuery({
    queryKey: [...productQueryKeys.all, 'detail', productId],
    queryFn: () => service.getProduct(productId ?? ''),
    enabled: productId !== null,
    meta: { [AUTHENTICATED_QUERY_META_KEY]: AUTHENTICATED_QUERY_META_VALUE },
  });
}

export function useProductCatalogExtensions(service: ProductService = productService) {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: [...productQueryKeys.all, 'categories'],
    queryFn: () => service.listCategories(),
    meta: { [AUTHENTICATED_QUERY_META_KEY]: AUTHENTICATED_QUERY_META_VALUE },
  });
  const units = useQuery({
    queryKey: [...productQueryKeys.all, 'units'],
    queryFn: () => service.listUnits(),
    meta: { [AUTHENTICATED_QUERY_META_KEY]: AUTHENTICATED_QUERY_META_VALUE },
  });
  const invalidateProducts = () =>
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
  return {
    categories,
    units,
    archiveProduct: useMutation({
      mutationFn: (productId: string) => service.archiveProduct(productId),
      onSuccess: invalidateProducts,
    }),
    createCategory: useMutation({
      mutationFn: (input: ProductCategoryData) => service.createCategory(input),
      onSuccess: invalidateProducts,
    }),
    updateCategory: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ProductCategoryData }) =>
        service.updateCategory(id, input),
      onSuccess: invalidateProducts,
    }),
    archiveCategory: useMutation({
      mutationFn: (categoryId: string) => service.archiveCategory(categoryId),
      onSuccess: invalidateProducts,
    }),
  };
}
