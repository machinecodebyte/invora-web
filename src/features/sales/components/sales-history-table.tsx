import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  SalesHistoryPage,
  SalesTransaction,
  SalesTransactionSource,
} from '@/features/sales/types';

export interface SalesHistoryTableProps {
  readonly page: SalesHistoryPage;
  readonly onPageChange: (offset: number) => void;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
}

/** Currency is intentionally omitted until application currency configuration exists. */
function formatAmount(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSource(source: SalesTransactionSource): string {
  switch (source) {
    case 'csv_upload':
      return 'CSV upload';
    case 'manual':
      return 'Manual';
    case 'api':
      return 'API';
  }
}

function SalesHistoryRow({ transaction }: { readonly transaction: SalesTransaction }) {
  return (
    <tr className="border-t border-border">
      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
        {formatDate(transaction.saleDate)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {transaction.product.name}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-foreground-muted">
        {transaction.product.sku}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
        {formatQuantity(transaction.quantity)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
        {formatAmount(transaction.unitPrice)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
        {formatAmount(transaction.totalAmount)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground-muted">
        {formatSource(transaction.source)}
      </td>
    </tr>
  );
}

function SalesHistoryPagination({ page, onPageChange }: SalesHistoryTableProps) {
  const pageCount = Math.max(Math.ceil(page.total / page.limit), 1);
  const currentPage = Math.floor(page.offset / page.limit) + 1;
  const canGoPrevious = page.offset > 0;
  const canGoNext = page.offset + page.limit < page.total;

  if (page.total <= page.limit) {
    return null;
  }

  return (
    <nav
      aria-label="Sales history pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
    >
      <p className="text-sm text-foreground-muted">
        Page {currentPage} of {pageCount}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoPrevious}
          aria-label="Previous sales history page"
          onClick={() => onPageChange(Math.max(page.offset - page.limit, 0))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoNext}
          aria-label="Next sales history page"
          onClick={() => onPageChange(page.offset + page.limit)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

/** Semantic, responsive table for the safe public Sales Transaction projection. */
export function SalesHistoryTable({ page, onPageChange }: SalesHistoryTableProps) {
  return (
    <Card aria-labelledby="sales-history-table-heading">
      <CardHeader>
        <CardTitle as="h2" id="sales-history-table-heading">
          Historical sales
        </CardTitle>
        <p className="text-sm text-foreground-muted">
          Sale date, product, quantity, pricing, and transaction source.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table
            className="min-w-[760px] w-full border-collapse"
            aria-label="Sales history"
          >
            <thead className="bg-surface-muted text-left">
              <tr>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-sm font-semibold"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-sm font-semibold"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-sm font-semibold"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold"
                >
                  Quantity
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold"
                >
                  Unit price
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold"
                >
                  Sale amount
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-sm font-semibold"
                >
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {page.transactions.map((transaction) => (
                <SalesHistoryRow key={transaction.id} transaction={transaction} />
              ))}
            </tbody>
          </table>
        </div>
        <SalesHistoryPagination page={page} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}
