import { afterEach, describe, expect, it } from 'vitest';

import {
  DASHBOARD_E2E_STORAGE_KEY,
  DashboardServiceError,
  createE2EDashboardService,
  createUnavailableDashboardService,
} from '@/features/dashboard/api';
import { DASHBOARD_SUMMARY_FIXTURE } from '@/tests/fixtures/dashboard';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Dashboard service boundary', () => {
  it('uses an honest no-data result before API integration', async () => {
    await expect(
      createUnavailableDashboardService().getDashboardSummary(),
    ).resolves.toBeNull();
  });

  it('reads a ready projection only from the Playwright test fixture channel', async () => {
    window.sessionStorage.setItem(
      DASHBOARD_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'ready', data: DASHBOARD_SUMMARY_FIXTURE }),
    );

    await expect(createE2EDashboardService().getDashboardSummary()).resolves.toEqual(
      DASHBOARD_SUMMARY_FIXTURE,
    );
  });

  it('normalizes the test-only failure mode to a safe dashboard error', async () => {
    window.sessionStorage.setItem(
      DASHBOARD_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'error' }),
    );

    await expect(createE2EDashboardService().getDashboardSummary()).rejects.toEqual(
      new DashboardServiceError(
        'dashboard_unavailable',
        'Unable to load dashboard data.',
      ),
    );
  });

  it('treats malformed test-only state as unavailable instead of crashing', async () => {
    window.sessionStorage.setItem(DASHBOARD_E2E_STORAGE_KEY, '{not-json');

    await expect(createE2EDashboardService().getDashboardSummary()).resolves.toBeNull();
  });
});
