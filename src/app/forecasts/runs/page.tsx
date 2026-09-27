import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { ForecastRunView } from '@/features/forecasting/components/forecast-run-view';

export const metadata: Metadata = {
  title: 'Forecast Run',
};

/** Protected Module 7 route; results and prediction details remain Module 8 scope. */
export default function ForecastRunPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PageContainer
          title="Forecast Run"
          description="Choose a planning horizon and track the lifecycle of a demand forecast run."
        >
          <ForecastRunView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
