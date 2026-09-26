'use client';

import { Button } from '@/components/ui/button';
import type { ReportExportState } from '@/features/reports/types';

export interface ReportExportActionsProps {
  readonly state: ReportExportState;
  readonly onExportCsv: () => Promise<void>;
}

/** CSV export interaction backed by the Reports service's Blob download flow. */
export function ReportExportActions({ state, onExportCsv }: ReportExportActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={() => void onExportCsv()}
        isLoading={state.status === 'preparing'}
        loadingLabel="Preparing CSV export"
      >
        Export CSV
      </Button>
      <div aria-live="polite" className="text-sm text-foreground-muted">
        {state.status === 'ready' ? `CSV export is ready: ${state.filename}` : null}
        {state.status === 'error' ? (
          <span role="alert" className="text-danger">
            {state.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
