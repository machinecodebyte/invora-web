'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { DashboardService } from '@/features/dashboard/api';
import { AlertsSummary } from '@/features/dashboard/components/alerts-summary';
import { DashboardChart } from '@/features/dashboard/components/dashboard-chart';
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton';
import { HighRiskSummary } from '@/features/dashboard/components/high-risk-summary';
import { KpiGrid } from '@/features/dashboard/components/kpi-grid';
import { useDashboardSummary } from '@/features/dashboard/hooks';

export interface DashboardViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  service?: DashboardService;
}

/** Dashboard composition and explicit data states, rendered beneath the protected route boundary. */
export function DashboardView({ service }: DashboardViewProps) {
  const { state, reload } = useDashboardSummary(service);

  if (state.status === 'loading') {
    return <DashboardSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title={state.message}
        description="Please try again. If the problem continues, contact your administrator."
        onRetry={reload}
      />
    );
  }

  if (state.status === 'empty') {
    return (
      <EmptyState
        title="No dashboard data available."
        description="Dashboard insights will appear after data is available."
      />
    );
  }

  const highRiskItems = [
    ...state.data.inventoryRisk.outOfStockItems,
    ...state.data.inventoryRisk.lowStockItems,
  ];

  return (
    <div className="space-y-8">
      <KpiGrid kpis={state.data.kpis} />
      <DashboardChart points={state.data.demandTrends.points} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsSummary alerts={state.data.reorderAlerts.topReorderItems} />
        <HighRiskSummary items={highRiskItems} />
      </div>
    </div>
  );
}
