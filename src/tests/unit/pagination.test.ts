import { describe, expect, it } from 'vitest';

import { currentPageNumber, hasMorePages, totalPageCount } from '@/types/api';

describe('hasMorePages', () => {
  it('reports more pages when records remain after the current window', () => {
    expect(hasMorePages({ total: 100, limit: 25, offset: 0 })).toBe(true);
  });

  it('reports no more pages on the final window', () => {
    expect(hasMorePages({ total: 100, limit: 25, offset: 75 })).toBe(false);
  });

  it('reports no more pages for an empty result set', () => {
    expect(hasMorePages({ total: 0, limit: 25, offset: 0 })).toBe(false);
  });

  it('reports no more pages for a partial final window', () => {
    expect(hasMorePages({ total: 30, limit: 25, offset: 25 })).toBe(false);
  });
});

describe('currentPageNumber', () => {
  it('is 1-based', () => {
    expect(currentPageNumber({ total: 100, limit: 25, offset: 0 })).toBe(1);
    expect(currentPageNumber({ total: 100, limit: 25, offset: 25 })).toBe(2);
    expect(currentPageNumber({ total: 100, limit: 25, offset: 75 })).toBe(4);
  });

  it('falls back to page 1 for a non-positive limit rather than dividing by zero', () => {
    expect(currentPageNumber({ total: 100, limit: 0, offset: 0 })).toBe(1);
  });
});

describe('totalPageCount', () => {
  it('rounds up a partial final page', () => {
    expect(totalPageCount({ total: 30, limit: 25, offset: 0 })).toBe(2);
  });

  it('returns an exact count when records divide evenly', () => {
    expect(totalPageCount({ total: 100, limit: 25, offset: 0 })).toBe(4);
  });

  it('returns zero for an empty result set', () => {
    expect(totalPageCount({ total: 0, limit: 25, offset: 0 })).toBe(0);
  });

  it('returns zero for a non-positive limit rather than dividing by zero', () => {
    expect(totalPageCount({ total: 100, limit: 0, offset: 0 })).toBe(0);
  });
});
