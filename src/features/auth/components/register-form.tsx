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
  registrationSchema,
  toRegistrationData,
  type RegistrationFormValues,
} from '@/features/auth/schemas';
import { ROUTES } from '@/lib/constants';

export interface RegisterFormProps {
  redirectTo: string;
}

/** Accessible registration form; confirmation stays in the UI and is never sent to the adapter. */
export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const { register: registerAccount, pendingAction, error, clearError } = useAuth();
  const isPending = pendingAction === 'register';
  const loginHref = `${ROUTES.login}?redirect=${encodeURIComponent(redirectTo)}`;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (values: RegistrationFormValues): Promise<void> => {
    const authenticated = await registerAccount(toRegistrationData(values));
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
        <Label htmlFor="register-email" required>
          Email
        </Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          invalid={errors.email !== undefined}
          aria-describedby={
            errors.email === undefined ? undefined : 'register-email-error'
          }
          className="mt-1.5"
          {...register('email', { onChange: clearError })}
        />
        {errors.email === undefined ? null : (
          <p id="register-email-error" className="mt-1.5 text-sm text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="register-password" required>
          Password
        </Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          disabled={isPending}
          invalid={errors.password !== undefined}
          aria-describedby={
            errors.password === undefined ? undefined : 'register-password-error'
          }
          className="mt-1.5"
          {...register('password', { onChange: clearError })}
        />
        {errors.password === undefined ? null : (
          <p id="register-password-error" className="mt-1.5 text-sm text-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="register-confirm-password" required>
          Confirm password
        </Label>
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          disabled={isPending}
          invalid={errors.confirmPassword !== undefined}
          aria-describedby={
            errors.confirmPassword === undefined
              ? undefined
              : 'register-confirm-password-error'
          }
          className="mt-1.5"
          {...register('confirmPassword', { onChange: clearError })}
        />
        {errors.confirmPassword === undefined ? null : (
          <p
            id="register-confirm-password-error"
            className="mt-1.5 text-sm text-danger"
          >
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" isLoading={isPending} loadingLabel="Creating account">
        Create account
      </Button>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{' '}
        <Link href={loginHref} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
