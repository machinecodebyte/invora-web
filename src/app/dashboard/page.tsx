import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/** Protected Module 2 route; all Dashboard data loading stays inside its feature slice. */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Dashboard"
          description="Your inventory, demand, and reorder overview."
        >
          <DashboardView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
