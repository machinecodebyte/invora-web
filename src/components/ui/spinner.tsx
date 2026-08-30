import { cn } from '@/lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Readonly<Record<SpinnerSize, string>> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Announced to assistive technology; the visual ring itself is decorative. */
  label?: string;
  className?: string;
}

/**
 * Indeterminate loading indicator.
 *
 * Exposed as `role="status"` with a visually hidden label so screen readers
 * announce the pending state that sighted users infer from the animation.
 */
export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-current border-t-transparent',
          SIZE_CLASSES[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
