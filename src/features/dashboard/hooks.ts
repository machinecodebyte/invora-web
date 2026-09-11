'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DashboardServiceError,
  dashboardService,
  type DashboardService,
} from '@/features/dashboard/api';
import type { DashboardViewState } from '@/features/dashboard/types';

const GENERIC_DASHBOARD_ERROR = 'Unable to load dashboard data.';

function toSafeErrorMessage(error: unknown): string {
  return error instanceof DashboardServiceError
    ? error.message
    : GENERIC_DASHBOARD_ERROR;
}

/**
 * Loads the Dashboard projection through an adapter boundary.
 *
 * A future TanStack Query hook can use the same DashboardService contract when
 * HTTP integration is enabled. Until then this keeps local unavailable, empty,
 * ready, and error states explicit and testable without any network traffic.
 */
export function useDashboardSummary(service: DashboardService = dashboardService): {
  state: DashboardViewState;
  reload: () => void;
} {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<DashboardViewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    void service
      .getDashboardSummary()
      .then((data) => {
        if (!active) {
          return;
        }
        setState(data === null ? { status: 'empty' } : { status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: 'error', message: toSafeErrorMessage(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [requestVersion, service]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, []);

  return { state, reload };
}
