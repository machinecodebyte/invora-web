import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { ForecastResultsView } from '@/features/forecasting/components/forecast-results-view';

export const metadata: Metadata = {
  title: 'Forecast Results',
};

interface ForecastResultsPageProps {
  readonly searchParams: Promise<{
    readonly runId?: string | readonly string[] | undefined;
  }>;
}

/** Protected Module 8 route; the untrusted run id is validated inside the feature. */
export default async function ForecastResultsPage({ searchParams }: ForecastResultsPageProps) {
  const params = await searchParams;
  const runId = typeof params.runId === 'string' ? params.runId : undefined;

  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Forecast Results"
          description="Review completed demand forecast predictions, evaluation metrics, and recorded actual demand."
        >
          <ForecastResultsView runId={runId} />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
