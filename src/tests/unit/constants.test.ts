import { describe, expect, it } from 'vitest';

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  API_V1_PREFIX,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from '@/lib/constants';
import { joinUrlPath } from '@/lib/utils';

describe('brand constants', () => {
  it('exposes the product name', () => {
    expect(APP_NAME).toBe('Invora');
  });

  it('uses the middle-dot tagline separator required by the brand', () => {
    // The backend stores an ASCII-safe variant for logs; the UI must render the
    // typographic form, so this asserts the exact expected string.
    expect(APP_TAGLINE).toBe('Predict · Optimize · Replenish');
  });

  it('describes the product without leaking implementation detail', () => {
    expect(APP_DESCRIPTION).toContain('demand forecasting');
  });
});

describe('API constants', () => {
  it('matches the backend API_V1_PREFIX contract', () => {
    expect(API_V1_PREFIX).toBe('/api/v1');
  });

  it('composes clean request paths against a base URL', () => {
    expect(joinUrlPath('http://localhost:8000', `${API_V1_PREFIX}/health`)).toBe(
      'http://localhost:8000/api/v1/health',
    );
  });

  it('uses a request timeout that is neither instant nor unbounded', () => {
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBeGreaterThan(1_000);
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
