import { NextResponse, type NextRequest } from 'next/server';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
] as const;

/** Extract only a valid HTTP(S) origin for `connect-src`; paths are not CSP sources. */
export function getApiOriginForCsp(apiBaseUrl: string | undefined): string | null {
  if (apiBaseUrl === undefined || apiBaseUrl.trim() === '') {
    return null;
  }

  try {
    const parsed = new URL(apiBaseUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}

/**
 * Build the strict document policy used by the production Proxy. Next.js reads
 * the nonce from the forwarded request policy and applies it to framework
 * scripts/styles, so inline execution is not broadly allowed.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  apiBaseUrl: string | undefined,
  isProductionApp: boolean,
): string {
  const connectSources = ["'self'", getApiOriginForCsp(apiBaseUrl)]
    .filter((source): source is string => source !== null)
    .join(' ');

  const directives = [
    ...CSP_DIRECTIVES,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `connect-src ${connectSources}`,
  ];

  if (isProductionApp) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Next.js 16 Proxy runs before App Router rendering. The forwarded request
 * header lets Next attach this nonce to its runtime scripts and styles; the
 * same policy is returned to the browser. Development intentionally bypasses
 * CSP because its HMR tooling needs a different policy from production.
 */
export function proxy(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(
    nonce,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_APP_ENV === 'production',
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
