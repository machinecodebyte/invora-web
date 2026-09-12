import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { ProductsView } from '@/features/products/components/products-view';

export const metadata: Metadata = {
  title: 'Products',
};

/** Protected Module 3 route; all Product Catalog behavior lives in its feature slice. */
export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer title="Products" description="Manage your product catalog.">
          <ProductsView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
