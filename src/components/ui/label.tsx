import type { LabelHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Associates the label with its control. Required to keep fields accessible. */
  htmlFor: string;
  /** Renders a required marker that is hidden from assistive technology. */
  required?: boolean;
  children: ReactNode;
}

/**
 * Form field label.
 *
 * `htmlFor` is mandatory so a label can never be rendered detached from its
 * control. The asterisk is decorative - communicate the constraint to assistive
 * technology with the control's own `required` attribute.
 */
export function Label({
  htmlFor,
  required = false,
  className,
  children,
  ...rest
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-sm font-medium text-foreground', className)}
      {...rest}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      ) : null}
    </label>
  );
}
