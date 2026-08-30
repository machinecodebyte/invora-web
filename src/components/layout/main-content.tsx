import type { ReactNode } from 'react';

import { MAIN_CONTENT_ELEMENT_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface MainContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * The page's `main` landmark and skip-link target.
 *
 * `tabIndex={-1}` lets the skip link move focus here programmatically without
 * adding the region to the normal tab order.
 */
export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      id={MAIN_CONTENT_ELEMENT_ID}
      tabIndex={-1}
      className={cn('flex-1 focus-visible:outline-none', className)}
    >
      {children}
    </main>
  );
}
