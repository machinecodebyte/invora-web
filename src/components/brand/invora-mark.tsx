import { Icon } from '@/components/ui/icon';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface InvoraMarkProps {
  compact?: boolean;
  className?: string;
}

/** Lightweight brand mark shared by the public site and authenticated shell. */
export function InvoraMark({ compact = false, className }: InvoraMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      >
        <Icon name="forecast" className="size-5" />
      </span>
      {compact ? null : (
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold tracking-[0.18em] text-foreground">
            {APP_NAME.toUpperCase()}
          </span>
          <span className="hidden text-xs text-foreground-muted sm:block">
            {APP_TAGLINE}
          </span>
        </span>
      )}
    </span>
  );
}
