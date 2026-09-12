import type { Ref, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Marks the field as failing validation and wires aria-invalid. */
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Multi-line field primitive for feature forms that require free-form text. */
export function Textarea({ invalid = false, className, ...rest }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
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
