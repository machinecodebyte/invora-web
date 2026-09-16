import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { LogoutButton } from '@/features/auth/components/logout-button';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { SettingsView } from '@/features/settings/components/settings-view';

export const metadata: Metadata = {
  title: 'Settings',
};

/** Protected Module 11 route for forecast and safety-stock defaults only. */
export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AppShell navigation={<LogoutButton />}>
        <PageContainer
          title="Settings"
          description="Manage defaults for future forecasts and inventory setup."
        >
          <SettingsView />
        </PageContainer>
      </AppShell>
    </ProtectedRoute>
  );
}
