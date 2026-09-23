import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ForecastRunViewState } from '@/features/forecasting/types';

export interface ForecastRunStatusProps {
  readonly state: Exclude<
    ForecastRunViewState,
    { readonly status: 'idle' | 'starting' }
  >;
  readonly onRefresh: () => Promise<void>;
  readonly onStartAnother: () => void;
}

function statusLabel(state: ForecastRunStatusProps['state']): string {
  switch (state.status) {
    case 'tracking':
      return state.run.status === 'pending' ? 'Pending' : 'Running';
    case 'checking_status':
      return state.run.status === 'pending' ? 'Pending' : 'Running';
    case 'status_error':
      return state.run.status === 'pending' ? 'Pending' : 'Running';
    case 'queue_error':
      return state.run.status === 'pending' ? 'Pending' : 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
  }
}

function runForState(state: ForecastRunStatusProps['state']) {
  return state.run;
}

function executionLabel(state: ForecastRunStatusProps['state']): string | null {
  if (
    state.status !== 'tracking' &&
    state.status !== 'checking_status' &&
    state.status !== 'status_error'
  ) {
    return null;
  }

  switch (state.job.status) {
    case 'queued':
      return 'Queued';
    case 'started':
    case 'retrying':
      return 'Processing';
    case 'finished':
      return 'Finished; reconciling run status';
    case 'failed':
      return 'Failed; reconciling run status';
    case 'cancelled':
      return 'Cancelled; reconciling run status';
  }
}

/** Status-only surface; it deliberately does not expose forecast results or progress percentages. */
export function ForecastRunStatus({
  state,
  onRefresh,
  onStartAnother,
}: ForecastRunStatusProps) {
  const run = runForState(state);
  const isChecking = state.status === 'checking_status';
  const canRefresh = state.status === 'tracking' || state.status === 'status_error';
  const isTerminal =
    state.status === 'completed' ||
    state.status === 'failed' ||
    state.status === 'cancelled' ||
    state.status === 'queue_error';
  const description =
    state.status === 'completed'
      ? 'The forecast run completed. Detailed forecast results are not shown in this module.'
      : state.status === 'failed'
        ? state.message
        : state.status === 'queue_error'
          ? 'The forecast run was created but could not be queued for processing.'
          : state.status === 'cancelled'
            ? 'This forecast run was cancelled before completion.'
            : 'The run is tracked through its durable job and lifecycle status. No percentage progress is available.';
  const executionStatus = executionLabel(state);

  return (
    <Card aria-labelledby="forecast-run-status-title" className="max-w-2xl">
      <CardHeader>
        <CardTitle id="forecast-run-status-title" as="h2">
          Forecast run status
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          role={
            state.status === 'failed' ||
            state.status === 'status_error' ||
            state.status === 'queue_error'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
          className="rounded-md border border-border bg-surface-muted p-4"
        >
          <p className="text-sm font-semibold text-foreground">
            Current status: {statusLabel(state)}
          </p>
          {executionStatus === null ? null : (
            <p className="mt-1 text-sm text-foreground-muted">
              Processing status: {executionStatus}
            </p>
          )}
          {run === null ? null : (
            <dl className="mt-3 grid gap-2 text-sm text-foreground-muted sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">Forecast horizon</dt>
                <dd>{run.horizonDays} days</dd>
              </div>
              <div className="min-w-0">
                <dt className="font-medium text-foreground">Run ID</dt>
                <dd className="break-all">{run.id}</dd>
              </div>
            </dl>
          )}
          {state.status === 'status_error' || state.status === 'queue_error' ? (
            <p className="mt-3 text-sm text-danger">{state.message}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {canRefresh || isChecking ? (
            <Button
              disabled={!canRefresh}
              isLoading={isChecking}
              loadingLabel="Refreshing forecast run status"
              onClick={() => void onRefresh()}
            >
              Refresh status
            </Button>
          ) : null}
          {isTerminal ? (
            <Button variant="secondary" onClick={onStartAnother}>
              Start another forecast
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
