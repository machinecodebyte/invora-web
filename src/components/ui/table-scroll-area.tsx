import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface TableScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Responsive boundary for feature-owned semantic tables.
 *
 * It intentionally owns only horizontal containment. Column definitions,
 * captions, headers, cells, and business formatting stay in the feature that
 * owns the table contract.
 */
export function TableScrollArea({
  className,
  children,
  ...rest
}: TableScrollAreaProps) {
  return (
    <div className={cn('w-full max-w-full overflow-x-auto', className)} {...rest}>
      {children}
    </div>
  );
}
