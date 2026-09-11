import { ROUTES } from '@/lib/constants';

/**
 * Return a local application path only.
 *
 * Authentication redirects are attacker-controlled query input. Absolute URLs,
 * protocol-relative URLs, backslashes, and malformed paths all fall back to the
 * protected application destination.
 */
export function getSafeRedirectPath(
  candidate: string | string[] | undefined,
  fallback: string = ROUTES.dashboard,
): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (
    value === undefined ||
    value === '' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback;
  }

  try {
    const origin = 'https://invora.invalid';
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
