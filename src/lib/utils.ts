import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names and resolve conflicting Tailwind utilities so
 * caller-supplied classes reliably win over component defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Fixed locale for all formatting helpers.
 *
 * Server and client must agree or React hydration mismatches; deriving the
 * locale from the runtime would break that guarantee.
 */
const DEFAULT_LOCALE = 'en-US';

const DEFAULT_FALLBACK = '—';

/**
 * Format a number for display, returning `fallback` for values that cannot be
 * rendered meaningfully (null, undefined, NaN, Infinity).
 */
export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

/**
 * Format a date, ISO string, or epoch millisecond value for display, returning
 * `fallback` for absent or unparseable input.
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
}

/** Remove every trailing slash so URL joining never produces `//`. */
export function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Join a base URL and a path with exactly one separating slash. */
export function joinUrlPath(baseUrl: string, path: string): string {
  const normalizedBase = stripTrailingSlashes(baseUrl);
  if (path === '') {
    return normalizedBase;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
