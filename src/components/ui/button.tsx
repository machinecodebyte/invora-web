import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-busy:cursor-progress';

const VARIANT_CLASSES: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
  ghost: 'text-foreground hover:bg-surface-muted',
  danger: 'bg-danger text-danger-foreground hover:bg-danger-hover',
};

const SIZE_CLASSES: Readonly<Record<ButtonSize, string>> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
};

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction while an action is in flight. */
  isLoading?: boolean;
  /** Assistive-technology label announced while loading. */
  loadingLabel?: string;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export interface ButtonClassNameOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  // Explicitly optional-or-undefined: callers forward an optional `className`
  // prop straight through, which `exactOptionalPropertyTypes` would reject.
  className?: string | undefined;
}

/**
 * Button styling for elements that must not be a `<button>`.
 *
 * Navigation belongs to an anchor, so a "link that looks like a button" uses
 * this on a real `<Link>` instead of nesting an anchor inside a button.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonClassNameOptions = {}): string {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

/**
 * Primary interactive control.
 *
 * `type` defaults to `"button"` so a control inside a form cannot submit it
 * accidentally; submit buttons opt in explicitly with `type="submit"`.
 *
 * While `isLoading` is set the button is disabled and marked `aria-busy`, and
 * the label stays visible so the control does not change width mid-action.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingLabel = 'Loading',
  type = 'button',
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...rest}
    >
      {isLoading ? <Spinner size="sm" label={loadingLabel} /> : null}
      {children}
    </button>
  );
}
