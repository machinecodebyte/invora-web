import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, getApiOriginForCsp } from '@/proxy';

describe('production content security policy', () => {
  it('allows only the configured HTTP(S) API origin for browser connections', () => {
    expect(getApiOriginForCsp('https://api.invora.example/api/v1')).toBe(
      'https://api.invora.example',
    );
    expect(getApiOriginForCsp('redis://cache.internal')).toBeNull();
    expect(getApiOriginForCsp('not-a-url')).toBeNull();
  });

  it('uses a per-response nonce and strict production directives', () => {
    const policy = buildContentSecurityPolicy(
      'test-nonce',
      'https://api.invora.example/api/v1',
      true,
    );

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-test-nonce'");
    expect(policy).toContain("connect-src 'self' https://api.invora.example");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('default-src *');
  });

  it('does not upgrade local HTTP calls in non-production environments', () => {
    expect(
      buildContentSecurityPolicy('test-nonce', 'http://localhost:8000', false),
    ).not.toContain('upgrade-insecure-requests');
  });
});
