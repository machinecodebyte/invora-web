import { describe, expect, it } from 'vitest';

import {
  createE2EAuthService,
  createUnavailableAuthService,
} from '@/features/auth/api';

describe('Auth adapter boundary', () => {
  it('keeps the default adapter unavailable without issuing a network request', async () => {
    const service = createUnavailableAuthService();

    await expect(
      service.login({ email: 'test@example.com', password: 'StrongPass1!' }),
    ).rejects.toMatchObject({
      code: 'authentication_unavailable',
    });
    await expect(service.getSession()).resolves.toBeNull();
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
    await expect(service.getSession()).resolves.toMatchObject({
      user: { email: 'test@example.com' },
    });
    await service.logout();
    await expect(service.getSession()).resolves.toBeNull();
  });
});
