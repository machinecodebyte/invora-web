/* eslint-disable no-console -- This module is the single sanctioned console
   boundary; every other module must log through it so redaction and level
   gating cannot be bypassed. */

import { getPublicEnv } from '@/lib/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured context attached to a log entry. */
export type LogContext = Record<string, unknown>;

/**
 * Keys whose values are never logged.
 *
 * Matched case-insensitively against a substring of the key, so
 * `refresh_token`, `Authorization`, and `user.password` are all covered.
 */
const REDACTED_KEY_PATTERNS = [
  'token',
  'password',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'credential',
] as const;

const REDACTED_PLACEHOLDER = '[redacted]';

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return REDACTED_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Replace sensitive values in a log context.
 *
 * Nested plain objects are traversed; arrays and other values are passed
 * through so structure is preserved for the reader.
 */
export function redactContext(context: LogContext): LogContext {
  const output: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) {
      output[key] = REDACTED_PLACEHOLDER;
      continue;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof Error) &&
      !(value instanceof Date)
    ) {
      output[key] = redactContext(value as LogContext);
      continue;
    }

    output[key] = value;
  }

  return output;
}

function resolveMinimumLevel(): LogLevel {
  try {
    return getPublicEnv().isProduction ? 'warn' : 'debug';
  } catch {
    // Misconfigured environments must still be able to report their own failure.
    return 'warn';
  }
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[resolveMinimumLevel()]) {
    return;
  }

  const payload = context === undefined ? undefined : redactContext(context);
  const args: unknown[] = payload === undefined ? [message] : [message, payload];

  if (level === 'error') {
    console.error(...args);
    return;
  }
  if (level === 'warn') {
    console.warn(...args);
    return;
  }
  if (level === 'debug') {
    console.debug(...args);
    return;
  }
  console.info(...args);
}

/**
 * Minimal logging abstraction.
 *
 * Keeps `console` usage in one auditable place, drops debug/info noise in
 * production, and redacts credentials so tokens cannot reach the console.
 * Because it is the only sink, wiring an external monitoring platform later is
 * a change to this module alone.
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    write('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
} as const;
