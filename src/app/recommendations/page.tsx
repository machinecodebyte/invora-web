import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { RecommendationsView } from '@/features/recommendations/components/recommendations-view';

export const metadata: Metadata = {
  title: 'Recommendations',
};

interface RecommendationsPageProps {
  readonly searchParams: Promise<{
    readonly forecastRunId?: string | readonly string[] | undefined;
  }>;
}

/** Protected Module 9 route; risk and reorder decisions remain backend-owned. */
export default async function RecommendationsPage({
  searchParams,
}: RecommendationsPageProps) {
  const params = await searchParams;
  const forecastRunId =
    typeof params.forecastRunId === 'string' ? params.forecastRunId : undefined;

  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Recommendations"
          description="Review reorder risk and backend-generated reorder quantities."
        >
          <RecommendationsView forecastRunId={forecastRunId} />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
