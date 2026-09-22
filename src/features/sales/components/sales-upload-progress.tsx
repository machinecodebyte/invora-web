import type { SalesUploadProgress } from '@/features/sales/types';

export interface SalesUploadProgressProps {
  progress: SalesUploadProgress;
}

/** Semantic, text-backed progress for the client-to-service upload step. */
export function SalesUploadProgress({ progress }: SalesUploadProgressProps) {
  if (progress.percent === null) {
    return (
      <section aria-label="Upload progress" className="space-y-2">
        <p role="status" className="text-sm font-medium text-foreground">
          {progress.label}
        </p>
        <p className="text-sm text-foreground-muted">
          Waiting for the upload result. Processing progress is not available.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Upload progress" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <p className="font-medium text-foreground">{progress.label}</p>
        <p className="text-foreground-muted">{progress.percent}%</p>
      </div>
      <progress
        className="h-2 w-full overflow-hidden rounded bg-surface-muted accent-primary"
        value={progress.percent}
        max={100}
        aria-label={`${progress.label}: ${progress.percent}%`}
      >
        {progress.percent}%
      </progress>
    </section>
  );
}
