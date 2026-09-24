import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ForecastRunService } from '@/features/forecasting/api';
import { ForecastRunView } from '@/features/forecasting/components/forecast-run-view';
import type { ForecastRun } from '@/features/forecasting/types';
import {
  FORECAST_JOB_QUEUED,
  FORECAST_RUN_FAILED_SEQUENCE,
  FORECAST_RUN_COMPLETED,
  FORECAST_RUN_PENDING,
  FORECAST_RUN_SEQUENCE,
  createForecastRunTestService,
} from '@/tests/fixtures/forecast-run';

afterEach(() => {
  vi.useRealTimers();
});

describe('ForecastRunView', () => {
  it('renders accessible horizon validation and enables start after a valid selection', async () => {
    const user = userEvent.setup();
    render(<ForecastRunView service={createForecastRunTestService()} />);

    const horizon = screen.getByLabelText(/^Forecast horizon/);
    const start = screen.getByRole('button', { name: 'Start Forecast' });
    expect(horizon).toHaveAttribute('required');
    expect(start).toBeDisabled();

    await user.click(horizon);
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a forecast horizon of 7, 15, or 30 days.',
    );
    expect(horizon).toHaveAttribute('aria-invalid', 'true');

    await user.selectOptions(horizon, '15');
    expect(start).toBeEnabled();
  });

  it('tracks pending, running, and completed lifecycle states without result data', async () => {
    const user = userEvent.setup();
    render(
      <ForecastRunView
        service={createForecastRunTestService({ runs: FORECAST_RUN_SEQUENCE })}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^Forecast horizon/), '15');
    await user.click(screen.getByRole('button', { name: 'Start Forecast' }));
    expect(await screen.findByText('Current status: Pending')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(await screen.findByText('Current status: Running')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(await screen.findByText('Current status: Completed')).toBeVisible();
    expect(
      screen.getByText(
        'The forecast run completed. View its persisted result data on the Forecast Results page.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/test-only internal execution detail/),
    ).not.toBeInTheDocument();
  });

  it('prevents duplicate starts while the service action is pending', async () => {
    const user = userEvent.setup();
    let resolveStart: ((run: ForecastRun) => void) | undefined;
    const startForecast = vi.fn(
      () =>
        new Promise<ForecastRun>((resolve) => {
          resolveStart = resolve;
        }),
    );
    const service: ForecastRunService = {
      startForecast,
      enqueueForecastRun: () => Promise.resolve(FORECAST_JOB_QUEUED),
      getForecastJobStatus: () => Promise.resolve(FORECAST_JOB_QUEUED),
      getForecastRunStatus: () => Promise.resolve(FORECAST_RUN_PENDING),
    };
    render(<ForecastRunView service={service} />);

    await user.selectOptions(screen.getByLabelText(/^Forecast horizon/), '15');
    const start = screen.getByRole('button', { name: 'Start Forecast' });
    await user.click(start);
    await user.click(start);

    expect(startForecast).toHaveBeenCalledTimes(1);
    expect(start).toBeDisabled();
    if (resolveStart === undefined) {
      throw new Error('Forecast start resolver was not initialized.');
    }
    resolveStart(FORECAST_RUN_PENDING);
    expect(await screen.findByText('Current status: Pending')).toBeVisible();
  });

  it('uses a safe failure message and resets terminal state for another run', async () => {
    const user = userEvent.setup();
    render(
      <ForecastRunView
        service={createForecastRunTestService({ runs: FORECAST_RUN_FAILED_SEQUENCE })}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^Forecast horizon/), '7');
    await user.click(screen.getByRole('button', { name: 'Start Forecast' }));
    await user.click(screen.getByRole('button', { name: 'Refresh status' }));

    expect(await screen.findByText('Current status: Failed')).toBeVisible();
    expect(screen.getByText('Forecast run failed.')).toBeVisible();
    expect(
      screen.queryByText('test-only internal execution detail'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start another forecast' }));
    expect(screen.getByRole('heading', { name: 'Start a forecast run' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start Forecast' })).toBeDisabled();
  });

  it('keeps the last known lifecycle visible when status refresh fails safely', async () => {
    const user = userEvent.setup();
    render(
      <ForecastRunView
        service={createForecastRunTestService({
          statusError: new Error('internal connection trace'),
        })}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^Forecast horizon/), '15');
    await user.click(screen.getByRole('button', { name: 'Start Forecast' }));
    await user.click(screen.getByRole('button', { name: 'Refresh status' }));

    expect(
      await screen.findByText('Unable to refresh forecast run status.'),
    ).toBeVisible();
    expect(screen.getByText('Current status: Pending')).toBeVisible();
    expect(screen.queryByText('internal connection trace')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Refresh status' })).toBeEnabled(),
    );
  });

  it('polls active jobs, reconciles the completed Forecast Run, and stops polling', async () => {
    vi.useFakeTimers();
    const getForecastJobStatus = vi
      .fn()
      .mockResolvedValueOnce({ ...FORECAST_JOB_QUEUED, status: 'started' })
      .mockResolvedValueOnce({ ...FORECAST_JOB_QUEUED, status: 'finished' });
    const getForecastRunStatus = vi.fn().mockResolvedValue(FORECAST_RUN_COMPLETED);
    const service: ForecastRunService = {
      startForecast: () => Promise.resolve(FORECAST_RUN_PENDING),
      enqueueForecastRun: () => Promise.resolve(FORECAST_JOB_QUEUED),
      getForecastJobStatus,
      getForecastRunStatus,
    };
    render(<ForecastRunView service={service} />);

    fireEvent.change(screen.getByLabelText(/^Forecast horizon/), {
      target: { value: '15' },
    });
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Forecast' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Processing status: Queued')).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByText('Processing status: Processing')).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByText('Current status: Completed')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View forecast results' })).toHaveAttribute(
      'href',
      `/forecasts/results?runId=${FORECAST_RUN_COMPLETED.id}`,
    );
    expect(getForecastRunStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000);
    });
    expect(getForecastJobStatus).toHaveBeenCalledTimes(2);
  });

  it('reconciles a failed terminal job without exposing job internals', async () => {
    vi.useFakeTimers();
    const failedRun = FORECAST_RUN_FAILED_SEQUENCE[1]!;
    const service: ForecastRunService = {
      startForecast: () => Promise.resolve(FORECAST_RUN_FAILED_SEQUENCE[0]!),
      enqueueForecastRun: () =>
        Promise.resolve({
          ...FORECAST_JOB_QUEUED,
          id: 'failed-job',
          runId: failedRun.id,
        }),
      getForecastJobStatus: () =>
        Promise.resolve({
          ...FORECAST_JOB_QUEUED,
          id: 'failed-job',
          runId: failedRun.id,
          status: 'failed',
        }),
      getForecastRunStatus: () => Promise.resolve(failedRun),
    };
    render(<ForecastRunView service={service} />);

    fireEvent.change(screen.getByLabelText(/^Forecast horizon/), {
      target: { value: '7' },
    });
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Forecast' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(screen.getByText('Current status: Failed')).toBeVisible();
    expect(screen.getByText('Forecast run failed.')).toBeVisible();
    expect(
      screen.queryByText(/rq_job_id|Redis|test-only internal/),
    ).not.toBeInTheDocument();
  });

  it('retains the created run and shows a safe queue failure without a process fallback', async () => {
    const user = userEvent.setup();
    render(
      <ForecastRunView
        service={createForecastRunTestService({
          enqueueError: new Error('redis://internal queue connection'),
        })}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^Forecast horizon/), '15');
    await user.click(screen.getByRole('button', { name: 'Start Forecast' }));

    expect(await screen.findByText('Current status: Pending')).toBeVisible();
    expect(screen.getByText('Unable to queue the forecast run.')).toBeVisible();
    expect(
      screen.queryByText('redis://internal queue connection'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start another forecast' }),
    ).toBeVisible();
  });

  it('cancels scheduled polling when the view unmounts', async () => {
    vi.useFakeTimers();
    const getForecastJobStatus = vi.fn().mockResolvedValue(FORECAST_JOB_QUEUED);
    const { unmount } = render(
      <ForecastRunView
        service={{
          startForecast: () => Promise.resolve(FORECAST_RUN_PENDING),
          enqueueForecastRun: () => Promise.resolve(FORECAST_JOB_QUEUED),
          getForecastJobStatus,
          getForecastRunStatus: () => Promise.resolve(FORECAST_RUN_PENDING),
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Forecast horizon/), {
      target: { value: '15' },
    });
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Forecast' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Processing status: Queued')).toBeVisible();
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(getForecastJobStatus).not.toHaveBeenCalled();
  });
});
