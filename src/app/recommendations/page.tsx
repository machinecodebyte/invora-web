import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { RecommendationsView } from '@/features/recommendations/components/recommendations-view';

export const metadata: Metadata = {
  title: 'Recommendations',
};

/** Protected Module 9 route; risk and reorder decisions remain backend-owned. */
export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Recommendations"
          description="Review reorder risk and backend-generated reorder quantities."
        >
          <RecommendationsView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
