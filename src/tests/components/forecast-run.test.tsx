import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ForecastRunService } from '@/features/forecasting/api';
import { ForecastRunView } from '@/features/forecasting/components/forecast-run-view';
import type { ForecastRun } from '@/features/forecasting/types';
import {
  FORECAST_RUN_FAILED_SEQUENCE,
  FORECAST_RUN_PENDING,
  FORECAST_RUN_SEQUENCE,
  createForecastRunTestService,
} from '@/tests/fixtures/forecast-run';

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
      screen.getByText(/Detailed forecast results are not shown in this module\./),
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
});
