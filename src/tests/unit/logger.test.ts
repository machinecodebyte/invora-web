import { describe, expect, it, vi } from 'vitest';

import { logger, redactContext } from '@/lib/logger';

describe('redactContext', () => {
  it.each([
    'accessToken',
    'refresh_token',
    'password',
    'Authorization',
    'apiKey',
    'api_key',
    'cookie',
    'clientSecret',
    'credential',
  ])('redacts the sensitive key %s', (key) => {
    expect(redactContext({ [key]: 'sensitive-value' })[key]).toBe('[redacted]');
  });

  it('preserves non-sensitive values', () => {
    expect(redactContext({ status: 500, path: '/api/v1/health' })).toEqual({
      status: 500,
      path: '/api/v1/health',
    });
  });

  it('redacts sensitive keys nested inside objects', () => {
    const output = redactContext({
      request: { url: '/api/v1/auth/login', headers: { authorization: 'Bearer abc' } },
    });

    expect(output).toEqual({
      request: { url: '/api/v1/auth/login', headers: { authorization: '[redacted]' } },
    });
  });

  it('matches keys case-insensitively', () => {
    expect(redactContext({ ACCESS_TOKEN: 'abc' }).ACCESS_TOKEN).toBe('[redacted]');
  });

  it('leaves arrays, dates, and errors intact', () => {
    const date = new Date('2026-03-14T00:00:00Z');
    const error = new Error('boom');
    const output = redactContext({ ids: [1, 2], date, error });

    expect(output.ids).toEqual([1, 2]);
    expect(output.date).toBe(date);
    expect(output.error).toBe(error);
  });

  it('handles null values without treating them as objects', () => {
    expect(redactContext({ digest: null })).toEqual({ digest: null });
  });
});

describe('logger', () => {
  it('writes errors to console.error with a redacted context', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('request_failed', { status: 500, accessToken: 'secret' });

    expect(consoleError).toHaveBeenCalledWith('request_failed', {
      status: 500,
      accessToken: '[redacted]',
    });
  });

  it('writes warnings to console.warn', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('slow_request');

    expect(consoleWarn).toHaveBeenCalledWith('slow_request');
  });

  it('omits the context argument entirely when none is supplied', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('boom');

    expect(consoleError).toHaveBeenCalledWith('boom');
  });

  it('suppresses debug and info output in production', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.invora.test');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.debug('cache_hit');
    logger.info('page_view');
    logger.error('request_failed');

    expect(consoleDebug).not.toHaveBeenCalled();
    expect(consoleInfo).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('emits debug and info output outside production', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://api.invora.test');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'local');
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.debug('cache_hit');
    logger.info('page_view');

    expect(consoleDebug).toHaveBeenCalledTimes(1);
    expect(consoleInfo).toHaveBeenCalledTimes(1);
  });

  it('still reports errors when the environment itself is misconfigured', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'not-a-url');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.error('config_invalid');
    logger.info('ignored');

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleInfo).not.toHaveBeenCalled();
  });
});
