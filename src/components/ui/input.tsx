import type { InputHTMLAttributes, Ref } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  /** Marks the field as failing validation and wires `aria-invalid`. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Text input primitive.
 *
 * Accepts a `ref` as a plain prop (React 19) so `register()` from React Hook
 * Form can be spread directly onto it. Labelling is the caller's
 * responsibility - pair it with `<Label htmlFor>` rather than a placeholder.
 */
export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
        'text-foreground placeholder:text-foreground-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger',
        className,
      )}
      {...rest}
    />
  );
}
