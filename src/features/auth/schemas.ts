import { z } from 'zod';

import type { LoginCredentials, RegistrationData } from '@/features/auth/types';

const EMAIL_MAX_LENGTH = 320;
const PASSWORD_MAX_LENGTH = 256;
const PASSWORD_MIN_LENGTH = 8;

/** Mirrors the backend's email normalization before validation. */
export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Mirrors the backend email rule without making the client more restrictive. */
export function isBackendCompatibleEmail(value: string): boolean {
  const normalized = normalizeAuthEmail(value);
  const separatorIndex = normalized.indexOf('@');
  const local = normalized.slice(0, Math.max(separatorIndex, 0));
  const domain = separatorIndex < 0 ? '' : normalized.slice(separatorIndex + 1);

  return (
    separatorIndex >= 0 &&
    local !== '' &&
    domain !== '' &&
    domain.includes('.') &&
    ![...normalized].some((character) => /\s/u.test(character))
  );
}

const emailSchema = z
  .string()
  .min(1, 'Email is required.')
  .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters.`)
  .refine(isBackendCompatibleEmail, 'Enter a valid email address.');

const loginPasswordSchema = z
  .string()
  .min(1, 'Password is required.')
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  );

const registrationPasswordSchema = loginPasswordSchema
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  )
  .refine((value) => /\p{Ll}/u.test(value), 'Password must include a lowercase letter.')
  .refine(
    (value) => /\p{Lu}/u.test(value),
    'Password must include an uppercase letter.',
  )
  .refine((value) => /\p{N}/u.test(value), 'Password must include a number.')
  .refine(
    (value) => [...value].some((character) => !/[\p{L}\p{N}]/u.test(character)),
    'Password must include a special character.',
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registrationSchema = z
  .object({
    email: emailSchema,
    password: registrationPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegistrationFormValues = z.infer<typeof registrationSchema>;

/** Normalize the data at the adapter boundary, not while a user is typing. */
export function toLoginCredentials(values: LoginFormValues): LoginCredentials {
  return {
    email: normalizeAuthEmail(values.email),
    password: values.password,
  };
}

/** `confirmPassword` is UI-only and is intentionally omitted from the adapter contract. */
export function toRegistrationData(values: RegistrationFormValues): RegistrationData {
  return {
    email: normalizeAuthEmail(values.email),
    password: values.password,
  };
}
