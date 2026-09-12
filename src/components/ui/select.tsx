import type { Ref, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Marks the field as failing validation and wires aria-invalid. */
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

/** Native select primitive with the same accessible validation treatment as Input. */
export function Select({ invalid = false, className, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
        'text-foreground',
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
