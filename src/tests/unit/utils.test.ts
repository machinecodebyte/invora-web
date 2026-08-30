import { describe, expect, it } from 'vitest';

import {
  cn,
  formatDate,
  formatNumber,
  joinUrlPath,
  stripTrailingSlashes,
} from '@/lib/utils';

describe('cn', () => {
  it('merges conditional class names and drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('lets later Tailwind utilities win over conflicting earlier ones', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('returns an empty string when given nothing', () => {
    expect(cn()).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats integers with locale grouping', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('honours Intl options', () => {
    expect(formatNumber(0.4567, { style: 'percent', maximumFractionDigits: 1 })).toBe(
      '45.7%',
    );
  });

  it('formats zero rather than treating it as absent', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('returns the fallback for %s', (_label, value) => {
    expect(formatNumber(value)).toBe('—');
  });

  it('supports a custom fallback', () => {
    expect(formatNumber(null, {}, 'n/a')).toBe('n/a');
  });
});

describe('formatDate', () => {
  it('formats a Date instance', () => {
    expect(
      formatDate(new Date('2026-03-14T00:00:00Z'), {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }),
    ).toBe('Mar 14, 2026');
  });

  it('formats an ISO string', () => {
    expect(
      formatDate('2026-03-14T00:00:00Z', { dateStyle: 'short', timeZone: 'UTC' }),
    ).toBe('3/14/26');
  });

  it('formats epoch milliseconds', () => {
    expect(
      formatDate(Date.UTC(2026, 2, 14), { dateStyle: 'medium', timeZone: 'UTC' }),
    ).toBe('Mar 14, 2026');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['unparseable input', 'not-a-date'],
  ])('returns the fallback for %s', (_label, value) => {
    expect(formatDate(value)).toBe('—');
  });
});

describe('stripTrailingSlashes', () => {
  it('removes every trailing slash', () => {
    expect(stripTrailingSlashes('http://localhost:8000///')).toBe(
      'http://localhost:8000',
    );
  });

  it('leaves a clean value untouched', () => {
    expect(stripTrailingSlashes('http://localhost:8000')).toBe('http://localhost:8000');
  });
});

describe('joinUrlPath', () => {
  it('inserts exactly one slash when neither side has one', () => {
    expect(joinUrlPath('http://api.test', 'api/v1/health')).toBe(
      'http://api.test/api/v1/health',
    );
  });

  it('collapses duplicate slashes at the join', () => {
    expect(joinUrlPath('http://api.test/', '/api/v1/health')).toBe(
      'http://api.test/api/v1/health',
    );
  });

  it('returns the normalized base for an empty path', () => {
    expect(joinUrlPath('http://api.test/', '')).toBe('http://api.test');
  });
});
