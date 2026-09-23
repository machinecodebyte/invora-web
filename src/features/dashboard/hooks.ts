'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DashboardServiceError,
  dashboardService,
  type DashboardService,
} from '@/features/dashboard/api';
import { toDisplayMessage } from '@/lib/api-error';
import type { DashboardViewState } from '@/features/dashboard/types';

const GENERIC_DASHBOARD_ERROR = 'Unable to load dashboard data.';

function toSafeErrorMessage(error: unknown): string {
  return error instanceof DashboardServiceError
    ? error.message
    : toDisplayMessage(error, GENERIC_DASHBOARD_ERROR);
}

/**
 * Loads the Dashboard projection through an adapter boundary.
 *
 * This preserves the existing bounded local-state architecture while its HTTP
 * adapter receives a caller-owned AbortSignal for navigation cancellation.
 */
export function useDashboardSummary(service: DashboardService = dashboardService): {
  state: DashboardViewState;
  reload: () => void;
} {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<DashboardViewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    void service
      .getDashboardSummary({ signal: controller.signal })
      .then((data) => {
        if (!active) {
          return;
        }
        setState(data === null ? { status: 'empty' } : { status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted) {
          setState({ status: 'error', message: toSafeErrorMessage(error) });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestVersion, service]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, []);

  return { state, reload };
}
