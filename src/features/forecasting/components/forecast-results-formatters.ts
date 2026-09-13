import { formatNumber } from '@/lib/utils';

export function formatForecastDate(value: string | null): string {
  if (value === null) {
    return '—';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return value;
  }
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

export function formatForecastValue(value: number | null): string {
  return formatNumber(value, { maximumFractionDigits: 3 });
}

export function formatForecastPercentage(value: number | null): string {
  return value === null
    ? '—'
    : `${formatNumber(value, { maximumFractionDigits: 2, minimumFractionDigits: 0 })}%`;
}
