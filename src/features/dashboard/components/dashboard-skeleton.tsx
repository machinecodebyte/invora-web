import { Skeleton } from '@/components/ui/skeleton';

/** Structural loading state with no implied business values. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-surface p-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-5 h-8 w-1/2" />
            <Skeleton className="mt-3 h-4 w-4/5" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
