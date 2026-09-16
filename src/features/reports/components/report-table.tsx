import { formatDate, formatNumber } from '@/lib/utils';
import type { ReportColumn, ReportValue } from '@/features/reports/types';
import type { ReportData } from '@/features/reports/types';

function formatCell(value: ReportValue, column: ReportColumn): string {
  if (value === null) {
    return '—';
  }
  if (typeof value === 'string') {
    return column.format === 'date'
      ? formatDate(value, { dateStyle: 'medium', timeZone: 'UTC' })
      : value;
  }
  if (column.format === 'currency') {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (column.format === 'percentage') {
    return `${formatNumber(value, { maximumFractionDigits: 2 })}%`;
  }
  return formatNumber(value, { maximumFractionDigits: 3 });
}

export interface ReportTableProps {
  readonly report: ReportData;
}

/** Semantic, horizontally scrollable table for the active backend report schema. */
export function ReportTable({ report }: ReportTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm" aria-label={report.title}>
        <thead className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
          <tr>
            {report.columns.map((column) => (
              <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {report.rows.map((row) => (
            <tr key={row.id}>
              {report.columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3 text-foreground">
                  {formatCell(row.cells[column.key] ?? null, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
