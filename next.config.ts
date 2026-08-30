import type { NextConfig } from 'next';

/**
 * Baseline security headers applied to every response.
 *
 * A full Content-Security-Policy is intentionally deferred: it requires
 * per-request nonce plumbing for the Next.js runtime and is tracked as
 * follow-up work in `docs/architecture.md`.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Next 16 removed the `eslint` build option along with `next lint`; linting
  // runs as its own pipeline step via `npm run lint`.
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
