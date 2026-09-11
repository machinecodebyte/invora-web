'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks';
import {
  loginSchema,
  toLoginCredentials,
  type LoginFormValues,
} from '@/features/auth/schemas';
import { ROUTES } from '@/lib/constants';

export interface LoginFormProps {
  redirectTo: string;
}

/** Accessible, backend-compatible email/password login form. */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const { login, pendingAction, error, clearError } = useAuth();
  const isPending = pendingAction === 'login';
  const registerHref = `${ROUTES.register}?redirect=${encodeURIComponent(redirectTo)}`;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    const authenticated = await login(toLoginCredentials(values));
    if (authenticated) {
      router.replace(redirectTo);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {error === null ? null : (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error.message}
        </p>
      )}

      <div>
        <Label htmlFor="login-email" required>
          Email
        </Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          invalid={errors.email !== undefined}
          aria-describedby={
            errors.email === undefined ? undefined : 'login-email-error'
          }
          className="mt-1.5"
          {...register('email', { onChange: clearError })}
        />
        {errors.email === undefined ? null : (
          <p id="login-email-error" className="mt-1.5 text-sm text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="login-password" required>
          Password
        </Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          invalid={errors.password !== undefined}
          aria-describedby={
            errors.password === undefined ? undefined : 'login-password-error'
          }
          className="mt-1.5"
          {...register('password', { onChange: clearError })}
        />
        {errors.password === undefined ? null : (
          <p id="login-password-error" className="mt-1.5 text-sm text-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" isLoading={isPending} loadingLabel="Signing in">
        Sign in
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        Need an account?{' '}
        <Link href={registerHref} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
