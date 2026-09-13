import type { SalesHistoryService } from '@/features/sales/api';
import type {
  SalesHistoryPage,
  SalesHistoryQuery,
  SalesTransaction,
  SalesTrendPoint,
} from '@/features/sales/types';

/** Deterministic Sales Transaction projections used exclusively by tests. */
export const SALES_HISTORY_TRANSACTIONS_FIXTURE: readonly SalesTransaction[] = [
  {
    id: 'test-sale-001',
    productId: 'test-product-001',
    product: {
      id: 'test-product-001',
      name: 'Test Widget Cable',
      sku: 'TEST-CBL-001',
    },
    uploadBatchId: 'test-upload-001',
    saleDate: '2026-03-12',
    quantity: 12.5,
    unitPrice: 8,
    totalAmount: 100,
    source: 'csv_upload',
    createdAt: '2026-03-12T09:00:00Z',
  },
  {
    id: 'test-sale-002',
    productId: 'test-product-002',
    product: {
      id: 'test-product-002',
      name: 'Test Widget Adapter',
      sku: 'TEST-ADP-002',
    },
    uploadBatchId: null,
    saleDate: '2026-03-08',
    quantity: 3,
    unitPrice: 20,
    totalAmount: 60,
    source: 'manual',
    createdAt: '2026-03-08T10:30:00Z',
  },
  {
    id: 'test-sale-003',
    productId: 'test-product-003',
    product: {
      id: 'test-product-003',
      name: 'Test Sample Item',
      sku: 'TEST-SMP-003',
    },
    uploadBatchId: null,
    saleDate: '2026-02-24',
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    source: 'api',
    createdAt: '2026-02-24T14:00:00Z',
  },
];

/** Deterministic date-wise quantity aggregates shaped like the backend trends API. */
export const SALES_HISTORY_TRENDS_FIXTURE: readonly SalesTrendPoint[] = [
  {
    periodStart: '2026-02-24',
    totalQuantity: 1,
    totalAmount: 0,
    transactionCount: 1,
  },
  {
    periodStart: '2026-03-08',
    totalQuantity: 3,
    totalAmount: 60,
    transactionCount: 1,
  },
  {
    periodStart: '2026-03-12',
    totalQuantity: 12.5,
    totalAmount: 100,
    transactionCount: 1,
  },
];

export const SALES_HISTORY_EMPTY_PAGE_FIXTURE: SalesHistoryPage = {
  transactions: [],
  total: 0,
  limit: 50,
  offset: 0,
};

function matchesTransaction(
  transaction: SalesTransaction,
  query: SalesHistoryQuery,
): boolean {
  if (query.dateFrom !== null && transaction.saleDate < query.dateFrom) {
    return false;
  }
  if (query.dateTo !== null && transaction.saleDate > query.dateTo) {
    return false;
  }
  if (query.source !== null && transaction.source !== query.source) {
    return false;
  }
  if (query.search === null) {
    return true;
  }

  const needle = query.search.toLocaleLowerCase();
  return (
    transaction.product.name.toLocaleLowerCase().includes(needle) ||
    transaction.product.sku.toLocaleLowerCase().includes(needle)
  );
}

function matchesTrend(point: SalesTrendPoint, query: SalesHistoryQuery): boolean {
  return (
    (query.dateFrom === null || point.periodStart >= query.dateFrom) &&
    (query.dateTo === null || point.periodStart <= query.dateTo)
  );
}

export interface SalesHistoryTestServiceOptions {
  readonly transactions?: readonly SalesTransaction[] | undefined;
  readonly trends?: readonly SalesTrendPoint[] | undefined;
  readonly listUnavailable?: boolean | undefined;
  readonly chartUnavailable?: boolean | undefined;
}

/**
 * Test-only deterministic adapter. It mirrors filter and offset/limit request
 * shapes without making a runtime request or becoming a production data source.
 */
export function createSalesHistoryTestService(
  options: SalesHistoryTestServiceOptions = {},
): SalesHistoryService {
  const transactions = options.transactions ?? SALES_HISTORY_TRANSACTIONS_FIXTURE;
  const trends = options.trends ?? SALES_HISTORY_TRENDS_FIXTURE;

  return {
    listSalesHistory: (query) => {
      if (options.listUnavailable) {
        return Promise.resolve(null);
      }

      const matched = transactions.filter((transaction) =>
        matchesTransaction(transaction, query),
      );
      return Promise.resolve({
        transactions: matched.slice(query.offset, query.offset + query.limit),
        total: matched.length,
        limit: query.limit,
        offset: query.offset,
      });
    },
    getSalesTrend: (query) =>
      Promise.resolve(
        options.chartUnavailable
          ? null
          : trends.filter((point) => matchesTrend(point, query)),
      ),
  };
}
