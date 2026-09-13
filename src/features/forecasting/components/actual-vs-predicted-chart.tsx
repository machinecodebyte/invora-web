import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  formatForecastDate,
  formatForecastValue,
} from '@/features/forecasting/components/forecast-results-formatters';
import type { ForecastResultChart } from '@/features/forecasting/types';

export interface ActualVsPredictedChartProps {
  readonly chart: ForecastResultChart | null;
  readonly errorMessage?: string | undefined;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 18, bottom: 28, left: 38 };

/** Lightweight SVG comparison of backend aggregates, preserving null actuals. */
export function ActualVsPredictedChart({
  chart,
  errorMessage,
}: ActualVsPredictedChartProps) {
  if (errorMessage !== undefined) {
    return (
      <Card aria-labelledby="actual-vs-predicted-heading">
        <CardHeader><CardTitle as="h2" id="actual-vs-predicted-heading">Actual vs predicted demand</CardTitle></CardHeader>
        <CardContent><p role="alert" className="text-sm text-danger">{errorMessage}</p></CardContent>
      </Card>
    );
  }

  if (chart === null || chart.points.length === 0) {
    return (
      <Card aria-labelledby="actual-vs-predicted-heading">
        <CardHeader><CardTitle as="h2" id="actual-vs-predicted-heading">Actual vs predicted demand</CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            className="py-8"
            title="No comparison data available."
            description="Actual-versus-predicted demand will appear when result periods are available."
          />
        </CardContent>
      </Card>
    );
  }

  const values = chart.points.flatMap((point) =>
    point.actualQuantity === null
      ? [point.predictedDemand]
      : [point.predictedDemand, point.actualQuantity],
  );
  const maximum = Math.max(...values, 1);
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const xAt = (index: number): number =>
    PADDING.left + (chart.points.length === 1 ? plotWidth / 2 : (index / (chart.points.length - 1)) * plotWidth);
  const yAt = (value: number): number => PADDING.top + plotHeight - (value / maximum) * plotHeight;
  const predictedPoints = chart.points
    .map((point, index) => `${xAt(index)},${yAt(point.predictedDemand)}`)
    .join(' ');
  const actualPoints = chart.points
    .flatMap((point, index) =>
      point.actualQuantity === null ? [] : [`${xAt(index)},${yAt(point.actualQuantity)}`],
    )
    .join(' ');
  const observedActuals = chart.points.filter((point) => point.actualQuantity !== null).length;
  const predictedTotal = chart.points.reduce((total, point) => total + point.predictedDemand, 0);
  const actualTotal = chart.points.reduce(
    (total, point) => total + (point.actualQuantity ?? 0),
    0,
  );
  const firstPoint = chart.points[0];
  const lastPoint = chart.points.at(-1);
  const accessibleSummary =
    firstPoint === undefined || lastPoint === undefined
      ? 'No comparison periods are available.'
      : `${chart.points.length} ${chart.interval} periods from ${formatForecastDate(firstPoint.periodStart)} to ${formatForecastDate(lastPoint.periodStart)}. Predicted total ${formatForecastValue(predictedTotal)}. Actual observations are available for ${observedActuals} periods with recorded total ${formatForecastValue(actualTotal)}.`;

  return (
    <Card aria-labelledby="actual-vs-predicted-heading">
      <CardHeader>
        <CardTitle as="h2" id="actual-vs-predicted-heading">Actual vs predicted demand</CardTitle>
        <p className="text-sm text-foreground-muted">Actual observations are not inferred when the backend returns no recorded quantity.</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm text-foreground-muted" aria-label="Chart legend">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5 bg-primary" />Predicted</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5 bg-foreground" />Actual</span>
        </div>
        <svg
          role="img"
          aria-label={accessibleSummary}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="mt-4 h-auto w-full"
        >
          <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={PADDING.top + plotHeight} y2={PADDING.top + plotHeight} stroke="currentColor" className="text-border" />
          <line x1={PADDING.left} x2={PADDING.left} y1={PADDING.top} y2={PADDING.top + plotHeight} stroke="currentColor" className="text-border" />
          <polyline fill="none" stroke="currentColor" strokeWidth="3" points={predictedPoints} className="text-primary" />
          {actualPoints === '' ? null : <polyline fill="none" stroke="currentColor" strokeWidth="3" points={actualPoints} className="text-foreground" />}
          {chart.points.map((point, index) => (
            <g key={point.periodStart}>
              <circle cx={xAt(index)} cy={yAt(point.predictedDemand)} r="3" className="fill-primary" />
              {point.actualQuantity === null ? null : <circle cx={xAt(index)} cy={yAt(point.actualQuantity)} r="3" className="fill-foreground" />}
              <text x={xAt(index)} y={CHART_HEIGHT - 7} textAnchor="middle" className="fill-foreground-muted text-[10px]">{formatForecastDate(point.periodStart)}</text>
            </g>
          ))}
        </svg>
        {observedActuals === chart.points.length ? null : (
          <p className="mt-2 text-sm text-foreground-muted">Actual data is unavailable for {chart.points.length - observedActuals} {chart.points.length - observedActuals === 1 ? 'period' : 'periods'}.</p>
        )}
      </CardContent>
    </Card>
  );
}
