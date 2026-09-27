import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { ReportsView } from '@/features/reports/components/reports-view';

export const metadata: Metadata = {
  title: 'Reports',
};

/** Protected Module 10 route; report generation and export remain backend-owned. */
export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PageContainer
          title="Reports"
          description="Review backend-defined operational reports and prepare CSV exports."
        >
          <ReportsView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
