import { describe, expect, it } from 'vitest';

import {
  isBackendCompatibleEmail,
  loginSchema,
  normalizeAuthEmail,
  registrationSchema,
  toRegistrationData,
} from '@/features/auth/schemas';

const STRONG_PASSWORD = 'StrongPass1!';

describe('Auth schemas', () => {
  it('normalizes a backend-compatible email at the adapter boundary', () => {
    expect(normalizeAuthEmail('  Owner@Example.COM ')).toBe('owner@example.com');
    expect(isBackendCompatibleEmail('  Owner@Example.COM ')).toBe(true);
  });

  it('rejects malformed and absent login credentials', () => {
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: 'owner@example', password: 'x' }).success,
    ).toBe(false);
  });

  it.each([
    ['short password', 'Ab1!abc'],
    ['missing lowercase letter', 'STRONGPASS1!'],
    ['missing uppercase letter', 'strongpass1!'],
    ['missing number', 'StrongPass!'],
    ['missing special character', 'StrongPass1'],
  ])('mirrors the backend registration policy for %s', (_label, password) => {
    expect(
      registrationSchema.safeParse({
        email: 'test@example.com',
        password,
        confirmPassword: password,
      }).success,
    ).toBe(false);
  });

  it('rejects a mismatched confirmation and omits it from the adapter payload', () => {
    const mismatched = registrationSchema.safeParse({
      email: 'test@example.com',
      password: STRONG_PASSWORD,
      confirmPassword: 'DifferentPass1!',
    });
    expect(mismatched.success).toBe(false);

    const values = registrationSchema.parse({
      email: ' Test@Example.com ',
      password: STRONG_PASSWORD,
      confirmPassword: STRONG_PASSWORD,
    });
    expect(toRegistrationData(values)).toEqual({
      email: 'test@example.com',
      password: STRONG_PASSWORD,
    });
  });
});
