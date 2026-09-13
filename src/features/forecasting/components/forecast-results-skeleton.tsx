import { Skeleton } from '@/components/ui/skeleton';

/** Loading structure for a complete Forecast Results response. */
export function ForecastResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading Forecast Results" className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
