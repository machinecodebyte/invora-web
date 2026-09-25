import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecommendationSummary } from '@/features/recommendations/types';
import { formatDate, formatNumber } from '@/lib/utils';

export interface RecommendationSummaryProps {
  readonly summary: RecommendationSummary;
}

/** Backend-provided aggregate only; no risk or reorder values are recalculated here. */
export function RecommendationSummary({ summary }: RecommendationSummaryProps) {
  return (
    <Card aria-labelledby="recommendation-summary-heading">
      <CardHeader>
        <CardTitle as="h2" id="recommendation-summary-heading">
          Recommendation summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            label="Recommendations"
            value={formatNumber(summary.totalRecommendations)}
          />
          <SummaryItem
            label="Total recommended reorder"
            value={formatNumber(summary.totalReorderQuantity, {
              maximumFractionDigits: 3,
            })}
          />
          <SummaryItem
            label="Total predicted demand"
            value={formatNumber(summary.totalPredictedDemand, {
              maximumFractionDigits: 3,
            })}
          />
          <SummaryItem
            label="Current stock"
            value={formatNumber(summary.totalCurrentStock, {
              maximumFractionDigits: 3,
            })}
          />
          <SummaryItem label="Critical" value={formatNumber(summary.criticalCount)} />
          <SummaryItem label="High" value={formatNumber(summary.highCount)} />
          <SummaryItem label="Medium" value={formatNumber(summary.mediumCount)} />
          <SummaryItem label="Low" value={formatNumber(summary.lowCount)} />
          <SummaryItem
            label="Overstocked"
            value={formatNumber(summary.overstockedCount)}
          />
          <SummaryItem
            label="Generated"
            value={formatDate(summary.latestGeneratedAt)}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </dt>
      <dd className="mt-1 tabular-nums text-sm text-foreground">{value}</dd>
    </div>
  );
}
