'use client';

import { Dialog } from '@/components/ui/dialog';
import {
  formatForecastDate,
  formatForecastValue,
} from '@/features/forecasting/components/forecast-results-formatters';
import { useForecastProductResult } from '@/features/forecasting/hooks';
import type { ForecastResultsService } from '@/features/forecasting/api';

export interface ForecastProductResultDialogProps {
  readonly runId: string;
  readonly productId: string;
  readonly service?: ForecastResultsService | undefined;
  readonly onClose: () => void;
}

/** On-demand, read-only detail for one persisted product Forecast Result. */
export function ForecastProductResultDialog({
  runId,
  productId,
  service,
  onClose,
}: ForecastProductResultDialogProps) {
  const state = useForecastProductResult(runId, productId, service);

  return (
    <Dialog open title="Product forecast detail" onClose={onClose}>
      {state.status === 'loading' ? (
        <p role="status">Loading product forecast detail...</p>
      ) : state.status === 'not_found' ? (
        <p>Forecast detail is not available for this product.</p>
      ) : state.status === 'error' ? (
        <p role="alert">{state.message}</p>
      ) : state.status === 'ready' ? (
        <div className="space-y-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Product" value={state.data.productName} />
            <DetailItem label="SKU" value={state.data.sku} />
            <DetailItem label="Unit" value={state.data.unit} />
            <DetailItem
              label="Total predicted demand"
              value={formatForecastValue(state.data.totalPredictedDemand)}
            />
            <DetailItem
              label="Current stock"
              value={formatForecastValue(state.data.currentStock)}
            />
            <DetailItem
              label="Safety stock"
              value={formatForecastValue(state.data.safetyStock)}
            />
          </dl>

          <div className="overflow-x-auto">
            <table
              className="min-w-full text-left text-sm"
              aria-label="Product forecast detail"
            >
              <thead className="border-b border-border text-foreground-muted">
                <tr>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Forecast date
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Predicted demand
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Actual quantity
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Model
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.points.map((point) => (
                  <tr key={point.forecastDate} className="border-b border-border">
                    <td className="px-2 py-2">
                      {formatForecastDate(point.forecastDate)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatForecastValue(point.predictedDemand)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatForecastValue(point.actualQuantity)}
                    </td>
                    <td className="px-2 py-2 text-foreground-muted">
                      {point.modelName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
