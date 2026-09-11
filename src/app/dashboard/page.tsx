import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * Auth-only protected destination.
 *
 * The Dashboard feature owns the actual application surface in Module 2; this
 * page deliberately provides no metrics, analytics, or business data.
 */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer title="Dashboard">
          <p className="max-w-2xl text-sm text-foreground-muted">
            Dashboard module will be implemented in Module 2.
          </p>
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
