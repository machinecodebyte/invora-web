import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { SalesHistoryView } from '@/features/sales/components/sales-history-view';

export const metadata: Metadata = {
  title: 'Sales History',
};

/** Protected Module 6 route; this remains a read-only historical sales view. */
export default function SalesHistoryPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PageContainer
          title="Sales History"
          description="Review historical sales transactions and quantity trends."
        >
          <SalesHistoryView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
