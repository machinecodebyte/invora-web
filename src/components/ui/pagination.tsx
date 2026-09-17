import { Button } from '@/components/ui/button';

export interface PaginationProps {
  /** Navigation landmark name, supplied by the feature owning the paginated data. */
  ariaLabel: string;
  currentPage: number;
  pageCount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** Optional contextual names preserve feature-specific screen-reader wording. */
  previousAriaLabel?: string | undefined;
  nextAriaLabel?: string | undefined;
}

/**
 * Generic offset-agnostic pagination controls.
 *
 * Features retain ownership of cursor/offset calculation and request state;
 * this primitive only presents page position and navigation intent.
 */
export function Pagination({
  ariaLabel,
  currentPage,
  pageCount,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  previousAriaLabel,
  nextAriaLabel,
}: PaginationProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
    >
      <p className="text-sm text-foreground-muted">
        Page {currentPage} of {pageCount}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoPrevious}
          aria-label={previousAriaLabel}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoNext}
          aria-label={nextAriaLabel}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
