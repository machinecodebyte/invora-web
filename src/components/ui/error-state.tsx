import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  /** Defaults to generic copy; features may pass a normalized `ApiError` message. */
  title?: string;
  description?: string;
  /** When provided, renders a retry control. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Shown when an operation failed.
 *
 * Announced via `role="alert"` so assistive technology reports the failure
 * without the user having to discover it. Only pass messages that are already
 * safe for display - `ApiError.message` is normalized for exactly this.
 */
export function ErrorState({
  title = 'Something went wrong.',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border',
        'bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-sm font-semibold text-danger">{title}</p>
      {description === undefined ? null : (
        <p className="max-w-prose text-sm text-foreground-muted">{description}</p>
      )}
      {onRetry === undefined ? null : (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
