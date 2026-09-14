import { Skeleton } from '@/components/ui/skeleton';

/** Loading outline for the Recommendations toolbar and risk table. */
export function RecommendationsSkeleton() {
  return (
    <div role="status" aria-label="Loading recommendations" className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
