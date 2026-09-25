'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { RiskBadge } from '@/features/recommendations/components/risk-badge';
import {
  useRecommendationDetail,
  useRecommendationStatusMutation,
} from '@/features/recommendations/hooks';
import type { RecommendationsService } from '@/features/recommendations/api';
import type {
  Recommendation,
  RecommendationStatusUpdate,
} from '@/features/recommendations/types';
import { formatDate, formatNumber } from '@/lib/utils';

export interface RecommendationDetailDialogProps {
  readonly recommendationId: string | null;
  readonly service?: RecommendationsService | undefined;
  readonly onClose: () => void;
  readonly onUpdated: () => void;
}

const STATUS_ACTIONS: Readonly<
  Record<Recommendation['status'], readonly RecommendationStatusUpdate[]>
> = {
  open: ['acknowledged', 'dismissed'],
  acknowledged: ['dismissed'],
  dismissed: [],
};

const ACTION_LABELS: Readonly<Record<RecommendationStatusUpdate, string>> = {
  acknowledged: 'Acknowledge',
  dismissed: 'Dismiss',
};

const RECOMMENDED_ACTION_LABELS: Readonly<
  Record<Recommendation['recommendedAction'], string>
> = {
  reorder_now: 'Reorder now',
  monitor: 'Monitor',
  no_reorder_needed: 'No reorder needed',
  overstock_review: 'Review overstock',
};

/** On-demand backend detail with only backend-confirmed status transitions. */
export function RecommendationDetailDialog({
  recommendationId,
  service,
  onClose,
  onUpdated,
}: RecommendationDetailDialogProps) {
  const detail = useRecommendationDetail(recommendationId, service);
  const { state: mutation, updateStatus } = useRecommendationStatusMutation(service);
  const [updated, setUpdated] = useState<Recommendation | null>(null);

  useEffect(() => {
    setUpdated(null);
  }, [recommendationId]);

  const recommendation =
    updated?.id === recommendationId
      ? updated
      : detail.status === 'ready'
        ? detail.data
        : null;

  const onStatusChange = async (status: RecommendationStatusUpdate): Promise<void> => {
    if (recommendation === null) {
      return;
    }
    const result = await updateStatus(recommendation.id, status);
    if (result !== null) {
      setUpdated(result);
      onUpdated();
    }
  };

  return (
    <Dialog
      open={recommendationId !== null}
      title="Recommendation details"
      onClose={onClose}
    >
      {detail.status === 'loading' && recommendation === null ? (
        <p role="status" className="text-sm text-foreground-muted">
          Loading recommendation detailsâ€¦
        </p>
      ) : null}
      {detail.status === 'not_found' ? (
        <ErrorState
          title="Recommendation details are no longer available."
          description="Return to the recommendation list and choose another row."
        />
      ) : null}
      {detail.status === 'error' ? (
        <ErrorState
          title={detail.message}
          description="Please try again from the recommendation list."
        />
      ) : null}
      {recommendation !== null ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge riskLevel={recommendation.riskLevel} />
            <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted">
              {recommendation.status}
            </span>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {recommendation.productName}
            </p>
            <p className="mt-1 font-mono text-xs text-foreground-muted">
              {recommendation.sku}
            </p>
          </div>
          <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
            <DetailItem
              label="Recommended action"
              value={RECOMMENDED_ACTION_LABELS[recommendation.recommendedAction]}
            />
            <DetailItem
              label="Recommended reorder"
              value={formatQuantity(
                recommendation.reorderQuantity,
                recommendation.unit,
              )}
            />
            <DetailItem
              label="Current stock"
              value={formatQuantity(recommendation.currentStock, recommendation.unit)}
            />
            <DetailItem
              label="Forecast demand"
              value={formatQuantity(
                recommendation.predictedDemand,
                recommendation.unit,
              )}
            />
            <DetailItem
              label="Required stock"
              value={formatQuantity(recommendation.requiredStock, recommendation.unit)}
            />
            <DetailItem
              label="Stock gap"
              value={formatQuantity(recommendation.stockGap, recommendation.unit)}
            />
            <DetailItem
              label="Generated"
              value={formatDate(recommendation.generatedAt)}
            />
            <DetailItem
              label="Forecast horizon"
              value={`${recommendation.forecastRun.horizonDays} days`}
            />
          </dl>
          <div>
            <h3 className="text-sm font-medium text-foreground">Reason</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              {recommendation.reason ?? 'â€”'}
            </p>
          </div>
          {mutation.status === 'error' ? (
            <p role="alert" className="text-sm text-danger">
              {mutation.message}
            </p>
          ) : null}
          {STATUS_ACTIONS[recommendation.status].length > 0 ? (
            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              {STATUS_ACTIONS[recommendation.status].map((status) => (
                <Button
                  key={status}
                  variant={status === 'dismissed' ? 'secondary' : 'primary'}
                  onClick={() => void onStatusChange(status)}
                  disabled={mutation.status === 'pending'}
                >
                  {mutation.status === 'pending' &&
                  mutation.recommendationId === recommendation.id
                    ? 'Savingâ€¦'
                    : ACTION_LABELS[status]}
                </Button>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-foreground-muted">
            Updating a recommendation status does not change Inventory or create a
            purchase order.
          </p>
        </div>
      ) : null}
    </Dialog>
  );
}

function DetailItem({
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
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatQuantity(value: number, unit: string): string {
  return `${formatNumber(value, { maximumFractionDigits: 3 })} ${unit}`;
}
