import { KpiCard } from '@/features/dashboard/components/kpi-card';
import type { DashboardKpi, DashboardKpis } from '@/features/dashboard/types';

export interface KpiGridProps {
  kpis: DashboardKpis;
}

function createDashboardKpis(kpis: DashboardKpis): readonly DashboardKpi[] {
  return [
    {
      key: 'totalProducts',
      label: 'Total products',
      value: kpis.totalProducts,
      format: 'number',
      description: 'Products in your catalog.',
    },
    {
      key: 'totalInventoryItems',
      label: 'Inventory items',
      value: kpis.totalInventoryItems,
      format: 'number',
      description: 'Tracked inventory records.',
    },
    {
      key: 'lowStockCount',
      label: 'Low-stock items',
      value: kpis.lowStockCount,
      format: 'number',
      description: 'Inventory records below minimum stock.',
    },
    {
      key: 'openRecommendations',
      label: 'Open reorder alerts',
      value: kpis.openRecommendations,
      format: 'number',
      description: 'Open reorder recommendations.',
    },
    {
      key: 'latestForecastMape',
      label: 'Latest forecast MAPE',
      value: kpis.latestForecastMape,
      format: 'percentage',
      description: 'Error from the latest completed forecast.',
    },
  ];
}

/** Summary KPI section derived only from the Dashboard Analytics projection. */
export function KpiGrid({ kpis }: KpiGridProps) {
  const items = createDashboardKpis(kpis);

  return (
    <section aria-labelledby="dashboard-kpis-heading">
      <h2
        id="dashboard-kpis-heading"
        className="mb-4 text-lg font-semibold text-foreground"
      >
        Key metrics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
