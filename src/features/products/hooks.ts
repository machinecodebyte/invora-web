'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  ProductServiceError,
  productService,
  type ProductService,
} from '@/features/products/api';
import type {
  Product,
  ProductCreateData,
  ProductListFilters,
  ProductPendingAction,
  ProductsViewState,
  ProductUpdateData,
} from '@/features/products/types';

const DEFAULT_FILTERS: ProductListFilters = { search: '', status: 'all' };
const GENERIC_PRODUCTS_ERROR = 'Unable to load products.';

function toSafeErrorMessage(error: unknown): string {
  return error instanceof ProductServiceError ? error.message : GENERIC_PRODUCTS_ERROR;
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
 * Product list and mutation orchestration through the ProductService boundary.
 *
 * A future TanStack Query integration can retain this transport-free contract.
 * Until backend integration, no Product Catalog network request is made.
 */
export function useProducts(
  service: ProductService = productService,
): UseProductsResult {
  const [filters, setFiltersState] = useState<ProductListFilters>(DEFAULT_FILTERS);
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<ProductsViewState>({ status: 'loading' });
  const [pendingAction, setPendingAction] = useState<ProductPendingAction>(null);

  useEffect(() => {
    let active = true;

    void service
      .listProducts(filters)
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

  const setFilters = useCallback((nextFilters: ProductListFilters) => {
    setState({ status: 'loading' });
    setFiltersState(nextFilters);
  }, []);

  const createProduct = useCallback(
    async (input: ProductCreateData): Promise<Product> => {
      setPendingAction('create');
      try {
        const product = await service.createProduct(input);
        reload();
        return product;
      } finally {
        setPendingAction(null);
      }
    },
    [reload, service],
  );

  const updateProduct = useCallback(
    async (productId: string, input: ProductUpdateData): Promise<Product> => {
      setPendingAction('update');
      try {
        const product = await service.updateProduct(productId, input);
        reload();
        return product;
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
    createProduct,
    updateProduct,
  };
}
