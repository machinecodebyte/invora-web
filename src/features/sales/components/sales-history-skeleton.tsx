import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Table-shaped loading state for the independent Sales History list request. */
export function SalesHistorySkeleton() {
  return (
    <Card aria-labelledby="sales-history-loading-heading">
      <CardHeader>
        <CardTitle as="h2" id="sales-history-loading-heading">
          Historical sales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div role="status" aria-label="Loading sales history" className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
