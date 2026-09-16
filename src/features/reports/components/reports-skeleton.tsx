import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

/** Loading representation that preserves the Reports page structure. */
export function ReportsSkeleton() {
  return (
    <div role="status" aria-label="Loading report" className="space-y-6">
      <span className="sr-only">Loading report</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <Spinner size="sm" label="Loading report" className="text-primary" />
        <Skeleton className="mt-4 h-52" />
      </div>
    </div>
  );
}
