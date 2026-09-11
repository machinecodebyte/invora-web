import { describe, expect, it } from 'vitest';

import { getSafeRedirectPath } from '@/features/auth/redirects';

describe('getSafeRedirectPath', () => {
  it('accepts internal paths and preserves their query/hash', () => {
    expect(getSafeRedirectPath('/dashboard?tab=forecast#latest')).toBe(
      '/dashboard?tab=forecast#latest',
    );
  });

  it.each([
    'https://malicious.example',
    '//malicious.example',
    '/\\malicious.example',
    'dashboard',
    '',
  ])('rejects unsafe redirect candidate %s', (candidate) => {
    expect(getSafeRedirectPath(candidate)).toBe('/dashboard');
  });

  it('uses the default route for absent and repeated query values', () => {
    expect(getSafeRedirectPath(undefined)).toBe('/dashboard');
    expect(getSafeRedirectPath(['/dashboard', 'https://malicious.example'])).toBe(
      '/dashboard',
    );
  });
});
