import { Spinner } from '@/components/ui/spinner';

/** Route-level fallback shown while a server component streams in. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Spinner size="lg" label="Loading…" className="text-primary" />
    </div>
  );
}
