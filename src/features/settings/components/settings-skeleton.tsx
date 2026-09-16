import { Skeleton } from '@/components/ui/skeleton';

/** Page-level loading state while Settings data is obtained from its service. */
export function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
