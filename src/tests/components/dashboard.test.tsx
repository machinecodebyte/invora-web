import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardServiceError, type DashboardService } from '@/features/dashboard/api';
import { AlertsSummary } from '@/features/dashboard/components/alerts-summary';
import { DashboardChart } from '@/features/dashboard/components/dashboard-chart';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';
import { HighRiskSummary } from '@/features/dashboard/components/high-risk-summary';
import { KpiCard } from '@/features/dashboard/components/kpi-card';
import { KpiGrid } from '@/features/dashboard/components/kpi-grid';
import type { DashboardKpi } from '@/features/dashboard/types';
import {
  DASHBOARD_SUMMARY_FIXTURE,
  EMPTY_DASHBOARD_SUMMARY_FIXTURE,
} from '@/tests/fixtures/dashboard';

function serviceFor(
  data: ReturnType<DashboardService['getDashboardSummary']>,
): DashboardService {
  return { getDashboardSummary: () => data };
}

describe('Dashboard KPI components', () => {
  it('renders data-provided KPI labels, values, and context', () => {
    const kpi: DashboardKpi = {
      key: 'totalProducts',
      label: 'Total products',
      value: 1240,
      format: 'number',
      description: 'Products in your catalog.',
    };
    render(<KpiCard kpi={kpi} />);

    expect(screen.getByRole('heading', { name: 'Total products' })).toBeVisible();
    expect(screen.getByText('1,240')).toBeVisible();
    expect(screen.getByText('Products in your catalog.')).toBeVisible();
  });

  it('renders the neutral unavailable value without inventing a metric', () => {
    const kpi: DashboardKpi = {
      key: 'latestForecastMape',
      label: 'Latest forecast MAPE',
      value: null,
      format: 'percentage',
      description: 'Error from the latest completed forecast.',
    };
    render(<KpiCard kpi={kpi} />);

    expect(screen.getByText('—')).toBeVisible();
  });

  it('maps the backend-aligned KPI projection into five reusable cards', () => {
    render(<KpiGrid kpis={DASHBOARD_SUMMARY_FIXTURE.kpis} />);

    expect(screen.getByRole('heading', { name: 'Key metrics' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Latest forecast MAPE' }),
    ).toBeVisible();
  });
});

describe('Dashboard data sections', () => {
  it('renders an accessible data chart, an empty chart, and a loading chart', () => {
    const { rerender } = render(
      <DashboardChart points={DASHBOARD_SUMMARY_FIXTURE.demandTrends.points} />,
    );

    expect(screen.getByRole('img', { name: /Demand trend\. 4 periods/ })).toBeVisible();
    expect(screen.getByText('2026-01-04')).toBeVisible();

    rerender(<DashboardChart points={[]} />);
    expect(screen.getByText('No demand trend data available.')).toBeVisible();

    rerender(<DashboardChart points={[]} isLoading />);
    expect(
      screen.getByRole('status', { name: 'Loading demand trend chart' }),
    ).toBeVisible();
  });

  it('renders alert severity as text and an honest empty state', () => {
    const { rerender } = render(
      <AlertsSummary
        alerts={DASHBOARD_SUMMARY_FIXTURE.reorderAlerts.topReorderItems}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Reorder alerts' })).toBeVisible();
    expect(screen.getByText('Critical risk')).toBeVisible();
    expect(screen.getByLabelText('Open reorder alerts')).toBeVisible();

    rerender(<AlertsSummary alerts={[]} />);
    expect(screen.getByText('No alerts available.')).toBeVisible();
  });

  it('renders high-risk inventory semantics and an honest empty state', () => {
    const items = [
      ...DASHBOARD_SUMMARY_FIXTURE.inventoryRisk.outOfStockItems,
      ...DASHBOARD_SUMMARY_FIXTURE.inventoryRisk.lowStockItems,
    ];
    const { rerender } = render(<HighRiskSummary items={items} />);

    expect(screen.getByRole('heading', { name: 'High-risk inventory' })).toBeVisible();
    expect(screen.getByText('Out Of Stock')).toBeVisible();
    expect(screen.getByLabelText('High-risk inventory items')).toBeVisible();

    rerender(<HighRiskSummary items={[]} />);
    expect(screen.getByText('No high-risk items available.')).toBeVisible();
  });
});

describe('DashboardView', () => {
  it('renders loading, ready, and partial empty states without a network request', async () => {
    let resolveSummary: (data: typeof DASHBOARD_SUMMARY_FIXTURE | null) => void = () =>
      undefined;
    const pendingService: DashboardService = {
      getDashboardSummary: () =>
        new Promise((resolve) => {
          resolveSummary = resolve;
        }),
    };
    const { rerender } = render(<DashboardView service={pendingService} />);

    expect(screen.getByRole('status', { name: 'Loading dashboard' })).toBeVisible();

    resolveSummary(DASHBOARD_SUMMARY_FIXTURE);
    expect(await screen.findByRole('heading', { name: 'Key metrics' })).toBeVisible();
    expect(screen.getAllByText('Widget Adapter')).toHaveLength(2);

    rerender(
      <DashboardView
        service={serviceFor(Promise.resolve(EMPTY_DASHBOARD_SUMMARY_FIXTURE))}
      />,
    );
    expect(await screen.findByText('No demand trend data available.')).toBeVisible();
    expect(screen.getByText('No alerts available.')).toBeVisible();
    expect(screen.getByText('No high-risk items available.')).toBeVisible();
  });

  it('uses a safe error state and never renders unexpected service details', async () => {
    render(
      <DashboardView
        service={serviceFor(
          Promise.reject(
            new DashboardServiceError(
              'dashboard_unavailable',
              'Unable to load dashboard data.',
            ),
          ),
        )}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load dashboard data.',
    );
  });
});
