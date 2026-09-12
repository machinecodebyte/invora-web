import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { InventoryView } from '@/features/inventory/components/inventory-view';

export const metadata: Metadata = {
  title: 'Inventory',
};

/** Protected Module 4 route; Inventory behavior remains inside its feature slice. */
export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Inventory"
          description="Monitor stock levels and record updates."
        >
          <InventoryView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
