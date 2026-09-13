import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatForecastDate,
  formatForecastValue,
} from '@/features/forecasting/components/forecast-results-formatters';
import type { ForecastPredictionPage } from '@/features/forecasting/types';

export interface ForecastResultsTableProps {
  readonly page: ForecastPredictionPage;
  readonly onPageChange: (offset: number) => void;
}

/** Paginated backend prediction rows; actuals deliberately belong only to the aggregate chart contract. */
export function ForecastResultsTable({ page, onPageChange }: ForecastResultsTableProps) {
  const pageCount = Math.max(Math.ceil(page.total / page.limit), 1);
  const currentPage = Math.floor(page.offset / page.limit) + 1;
  const previousEnabled = page.offset > 0;
  const nextEnabled = page.offset + page.limit < page.total;

  return (
    <Card aria-labelledby="forecast-results-table-heading">
      <CardHeader>
        <CardTitle as="h2" id="forecast-results-table-heading">Forecast predictions</CardTitle>
        <p className="text-sm text-foreground-muted">
          Predicted demand by product and forecast date. Actual quantities are available only in the aggregate comparison chart.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse" aria-label="Forecast predictions">
            <thead className="bg-surface-muted text-left">
              <tr>
                <HeadCell>Product</HeadCell>
                <HeadCell>SKU</HeadCell>
                <HeadCell>Forecast date</HeadCell>
                <HeadCell align="right">Predicted demand</HeadCell>
                <HeadCell>Unit</HeadCell>
                <HeadCell>Model</HeadCell>
              </tr>
            </thead>
            <tbody>
              {page.predictions.map((prediction) => (
                <tr key={`${prediction.productId}-${prediction.forecastDate}`} className="border-t border-border">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{prediction.productName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-foreground-muted">{prediction.sku}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{formatForecastDate(prediction.forecastDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-foreground">{formatForecastValue(prediction.predictedDemand)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground-muted">{prediction.unit}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground-muted">{prediction.modelName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {page.total <= page.limit ? null : (
          <nav aria-label="Forecast Results pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-foreground-muted">Page {currentPage} of {pageCount}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={!previousEnabled} onClick={() => onPageChange(Math.max(page.offset - page.limit, 0))}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={!nextEnabled} onClick={() => onPageChange(page.offset + page.limit)}>Next</Button>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  );
}

function HeadCell({ children, align = 'left' }: { readonly children: string; readonly align?: 'left' | 'right' | undefined }) {
  return <th scope="col" className={align === 'right' ? 'whitespace-nowrap px-4 py-3 text-right text-sm font-semibold' : 'whitespace-nowrap px-4 py-3 text-sm font-semibold'}>{children}</th>;
}
