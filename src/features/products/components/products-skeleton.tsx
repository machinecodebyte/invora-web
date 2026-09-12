import { Skeleton } from '@/components/ui/skeleton';

/** Loading shape for Product Catalog content while its service resolves. */
export function ProductsSkeleton() {
  return (
    <div role="status" aria-label="Loading products" className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="rounded-lg border border-border bg-surface p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-5 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-full" />
      </div>
    </div>
  );
}
