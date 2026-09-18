import { describe, expect, it } from 'vitest';

import {
  AuthAdapterError,
  createE2EAuthService,
  createHttpAuthService,
  createUnavailableAuthService,
  type AuthApiClient,
} from '@/features/auth/api';
import type { RequestBody, RequestConfig } from '@/lib/api-client';

interface RecordedCall {
  path: string;
  body: RequestBody | undefined;
  config: RequestConfig | undefined;
}

class StubAuthClient implements AuthApiClient {
  readonly getCalls: RecordedCall[] = [];
  readonly postCalls: RecordedCall[] = [];
  getResponses: unknown[] = [];
  postResponses: unknown[] = [];
  getError: unknown = null;
  postError: unknown = null;

  get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse> {
    this.getCalls.push({ path, body: undefined, config });
    if (this.getError !== null) {
      return Promise.reject(this.getError);
    }
    return Promise.resolve(this.getResponses.shift() as TResponse);
  }

  post<TResponse>(
    path: string,
    body?: RequestBody,
    config?: RequestConfig,
  ): Promise<TResponse> {
    this.postCalls.push({ path, body, config });
    if (this.postError !== null) {
      return Promise.reject(this.postError);
    }
    return Promise.resolve(this.postResponses.shift() as TResponse);
  }
}

function authPayload(): object {
  return {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      full_name: 'Owner User',
    },
    tokens: {
      access_token: 'access-token',
      token_type: 'bearer',
      expires_in: 1800,
    },
  };
}

describe('Auth adapter boundary', () => {
  it('keeps the unavailable test seam from issuing a network request', async () => {
    const service = createUnavailableAuthService();

    await expect(
      service.login({ email: 'test@example.com', password: 'StrongPass1!' }),
    ).rejects.toMatchObject({
      code: 'authentication_unavailable',
    });
    await expect(service.getSession()).resolves.toBeNull();
  });

  it('uses the cookie-aware Auth contract for login without exposing refresh data', async () => {
    const client = new StubAuthClient();
    client.postResponses = [authPayload()];
    const service = createHttpAuthService(client);

    const session = await service.login({
      email: 'owner@example.com',
      password: 'StrongPass1!',
    });

    expect(session).toMatchObject({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        fullName: 'Owner User',
      },
    });
    expect(client.postCalls).toEqual([
      {
        path: '/api/v1/auth/login',
        body: { email: 'owner@example.com', password: 'StrongPass1!' },
        config: {
          withAuth: false,
          withCredentials: true,
          retryOnAuthenticationFailure: false,
        },
      },
    ]);
  });

  it('omits empty optional full names from the registration payload', async () => {
    const client = new StubAuthClient();
    client.postResponses = [authPayload()];
    const service = createHttpAuthService(client);

    await service.register({
      email: 'owner@example.com',
      password: 'StrongPass1!',
      fullName: '   ',
    });

    expect(client.postCalls[0]).toMatchObject({
      path: '/api/v1/auth/register',
      body: { email: 'owner@example.com', password: 'StrongPass1!' },
    });
  });

  it('restores a session through refresh followed by the protected me contract', async () => {
    const client = new StubAuthClient();
    client.postResponses = [authPayload()];
    client.getResponses = [
      {
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          full_name: 'Owner User',
        },
      },
    ];
    const service = createHttpAuthService(client);

    await expect(service.getSession()).resolves.toMatchObject({
      accessToken: 'access-token',
      user: { email: 'owner@example.com' },
    });
    expect(client.postCalls[0]).toMatchObject({
      path: '/api/v1/auth/refresh',
      config: {
        withAuth: false,
        withCredentials: true,
        retryOnAuthenticationFailure: false,
      },
    });
    expect(client.getCalls[0]).toMatchObject({
      path: '/api/v1/auth/me',
      config: {
        withAuth: false,
        withCredentials: true,
        retryOnAuthenticationFailure: false,
        headers: { Authorization: 'Bearer access-token' },
      },
    });
  });

  it('maps invalid login responses to the generic credential-safe error', async () => {
    const client = new StubAuthClient();
    client.postError = new AuthAdapterError(
      'invalid_credentials',
      'Invalid email or password.',
    );
    const service = createHttpAuthService(client);

    await expect(
      service.login({ email: 'owner@example.com', password: 'WrongPass1!' }),
    ).rejects.toMatchObject({
      code: 'invalid_credentials',
      message: 'Invalid email or password.',
    });
  });

  it('persists only test state for the E2E adapter and clears it on logout', async () => {
    const service = createE2EAuthService();

    const session = await service.register({
      email: 'test@example.com',
      password: 'StrongPass1!',
    });

    expect(session.user).toEqual({
      id: 'e2e-user',
      email: 'test@example.com',
      fullName: null,
    });
    await expect(service.refreshSession()).resolves.toMatchObject({
      user: { email: 'test@example.com' },
    });
    await service.logout();
    await expect(service.getSession()).resolves.toBeNull();
  });
});
