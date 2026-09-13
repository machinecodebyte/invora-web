import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { SalesUploadView } from '@/features/sales/components/sales-upload-view';

export const metadata: Metadata = {
  title: 'Sales Upload',
};

/** Protected Module 5 route; Sales History remains outside this upload slice. */
export default function SalesUploadPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Sales Upload"
          description="Upload historical sales demand in the supported CSV format."
        >
          <SalesUploadView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
