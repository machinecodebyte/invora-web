import { Pagination } from '@/components/ui/pagination';
import { TableScrollArea } from '@/components/ui/table-scroll-area';
import { ReorderQuantity } from '@/features/recommendations/components/reorder-quantity';
import { RiskBadge } from '@/features/recommendations/components/risk-badge';
import type {
  RecommendationPage,
  RecommendationStatus,
} from '@/features/recommendations/types';
import { formatNumber } from '@/lib/utils';

function formatQuantity(value: number, unit: string): string {
  return `${formatNumber(value, { maximumFractionDigits: 3 })} ${unit}`;
}

const STATUS_LABELS: Readonly<Record<RecommendationStatus, string>> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
};

export interface RiskTableProps {
  readonly page: RecommendationPage;
  readonly onPageChange: (offset: number) => void;
}

/** Semantic read-only Reorder Recommendation risk table with backend offset pagination. */
export function RiskTable({ page, onPageChange }: RiskTableProps) {
  const currentPage = Math.floor(page.offset / page.limit) + 1;
  const pageCount = Math.max(Math.ceil(page.total / page.limit), 1);
  const canGoPrevious = page.offset > 0;
  const canGoNext = page.offset + page.limit < page.total;

  return (
    <TableScrollArea className="rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <caption className="sr-only">Reorder recommendations</caption>
        <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Product</th>
            <th scope="col" className="px-4 py-3 font-medium">SKU</th>
            <th scope="col" className="px-4 py-3 font-medium">Risk</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Current stock</th>
            <th scope="col" className="px-4 py-3 font-medium">Forecast demand</th>
            <th scope="col" className="px-4 py-3 font-medium">Recommended reorder</th>
            <th scope="col" className="px-4 py-3 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {page.recommendations.map((recommendation) => (
            <tr key={recommendation.id} className="align-top text-foreground">
              <td className="max-w-52 break-words px-4 py-3 font-medium">
                {recommendation.productName}
              </td>
              <td className="break-all px-4 py-3 font-mono text-xs">{recommendation.sku}</td>
              <td className="px-4 py-3"><RiskBadge riskLevel={recommendation.riskLevel} /></td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="inline-flex rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted">
                  {STATUS_LABELS[recommendation.status]}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {formatQuantity(recommendation.currentStock, recommendation.unit)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {formatQuantity(recommendation.predictedDemand, recommendation.unit)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <ReorderQuantity
                  quantity={recommendation.reorderQuantity}
                  unit={recommendation.unit}
                />
              </td>
              <td className="min-w-64 max-w-md break-words px-4 py-3 text-foreground-muted">
                {recommendation.reason ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {page.total <= page.limit ? null : (
        <Pagination
          ariaLabel="Recommendations pagination"
          currentPage={currentPage}
          pageCount={pageCount}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onPrevious={() => onPageChange(Math.max(page.offset - page.limit, 0))}
          onNext={() => onPageChange(page.offset + page.limit)}
        />
      )}
    </TableScrollArea>
  );
}
