'use client';

import { useToast } from '@/hooks/use-toast';
import type { ToastVariant } from '@/lib/toast';
import { cn } from '@/lib/utils';

const VARIANT_CLASSES: Readonly<Record<ToastVariant, string>> = {
  info: 'border-border',
  success: 'border-success',
  warning: 'border-warning',
  error: 'border-danger',
};

/**
 * Render surface for the shared toast store.
 *
 * Mounted once by the app shell. Errors are announced assertively while other
 * variants are polite, so a failure interrupts the screen reader but routine
 * confirmations wait for a pause.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto w-full max-w-sm rounded-lg border-l-4 border border-border',
            'bg-surface p-4 shadow-md',
            VARIANT_CLASSES[toast.variant],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{toast.title}</p>
              {toast.description === null ? null : (
                <p className="mt-1 text-sm text-foreground-muted">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={`Dismiss notification: ${toast.title}`}
              className={cn(
                'shrink-0 rounded-sm px-1 text-foreground-muted transition-colors',
                'hover:text-foreground focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring',
              )}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
