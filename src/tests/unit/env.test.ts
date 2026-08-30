import { describe, expect, it, vi } from 'vitest';

import {
  APP_ENVIRONMENTS,
  EnvironmentConfigurationError,
  isApiBaseUrlConfigured,
  parsePublicEnv,
  readRawPublicEnv,
  type RawPublicEnv,
} from '@/lib/env';

function rawEnv(overrides: Partial<RawPublicEnv> = {}): RawPublicEnv {
  return {
    NEXT_PUBLIC_API_BASE_URL: 'http://api.invora.test',
    NEXT_PUBLIC_APP_ENV: 'local',
    ...overrides,
  };
}

describe('parsePublicEnv', () => {
  it('returns normalized configuration for valid values', () => {
    expect(parsePublicEnv(rawEnv())).toEqual({
      apiBaseUrl: 'http://api.invora.test',
      appEnv: 'local',
      isProduction: false,
    });
  });

  it('strips trailing slashes from the base URL so joined paths stay clean', () => {
    const env = parsePublicEnv(
      rawEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.test//' }),
    );
    expect(env.apiBaseUrl).toBe('https://api.test');
  });

  it('trims surrounding whitespace', () => {
    const env = parsePublicEnv(
      rawEnv({ NEXT_PUBLIC_API_BASE_URL: '  http://api.test  ' }),
    );
    expect(env.apiBaseUrl).toBe('http://api.test');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
  ])('throws when the base URL is %s', (_label, value) => {
    expect(() => parsePublicEnv(rawEnv({ NEXT_PUBLIC_API_BASE_URL: value }))).toThrow(
      EnvironmentConfigurationError,
    );
  });

  it('rejects a relative URL', () => {
    expect(() =>
      parsePublicEnv(rawEnv({ NEXT_PUBLIC_API_BASE_URL: '/api/v1' })),
    ).toThrow(/absolute URL/);
  });

  it('rejects a non-http protocol', () => {
    expect(() =>
      parsePublicEnv(rawEnv({ NEXT_PUBLIC_API_BASE_URL: 'ftp://api.test' })),
    ).toThrow(/http:\/\/ or https:\/\//);
  });

  it('defaults the environment label to local when unset', () => {
    expect(parsePublicEnv(rawEnv({ NEXT_PUBLIC_APP_ENV: undefined })).appEnv).toBe(
      'local',
    );
  });

  it('normalizes the environment label case', () => {
    expect(parsePublicEnv(rawEnv({ NEXT_PUBLIC_APP_ENV: 'PRODUCTION' })).appEnv).toBe(
      'production',
    );
  });

  it('flags production so callers can gate behaviour on it', () => {
    expect(
      parsePublicEnv(rawEnv({ NEXT_PUBLIC_APP_ENV: 'production' })).isProduction,
    ).toBe(true);
    expect(
      parsePublicEnv(rawEnv({ NEXT_PUBLIC_APP_ENV: 'staging' })).isProduction,
    ).toBe(false);
  });

  it('accepts every documented environment', () => {
    for (const environment of APP_ENVIRONMENTS) {
      expect(parsePublicEnv(rawEnv({ NEXT_PUBLIC_APP_ENV: environment })).appEnv).toBe(
        environment,
      );
    }
  });

  it('rejects an unrecognized environment rather than guessing', () => {
    expect(() => parsePublicEnv(rawEnv({ NEXT_PUBLIC_APP_ENV: 'qa' }))).toThrow(
      EnvironmentConfigurationError,
    );
  });
});

describe('readRawPublicEnv', () => {
  it('reads values from process.env', () => {
    // Literal member access is required for Next.js build-time inlining; this
    // asserts the read actually reflects the environment.
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://from-process-env.test');
    expect(readRawPublicEnv().NEXT_PUBLIC_API_BASE_URL).toBe(
      'http://from-process-env.test',
    );
  });
});

describe('isApiBaseUrlConfigured', () => {
  it('reports true for a valid base URL', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.invora.test');
    expect(isApiBaseUrlConfigured()).toBe(true);
  });

  it('reports false instead of throwing when configuration is unusable', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'not-a-url');
    expect(isApiBaseUrlConfigured()).toBe(false);
  });
});
