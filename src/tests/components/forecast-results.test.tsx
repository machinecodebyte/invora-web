import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  ForecastResultsServiceError,
  type ForecastResultsService,
} from '@/features/forecasting/api';
import { ForecastResultsView } from '@/features/forecasting/components/forecast-results-view';
import type { ForecastResultsData } from '@/features/forecasting/types';
import {
  EMPTY_FORECAST_RESULTS_DATA,
  FORECAST_RESULTS_DATA,
  FORECAST_RESULTS_RUN_ID,
  createForecastResultsTestService,
} from '@/tests/fixtures/forecast-results';

describe('ForecastResultsView', () => {
  it('requires a selected valid run before attempting to load results', () => {
    render(<ForecastResultsView service={createForecastResultsTestService()} />);
    expect(screen.getByText('Select a forecast run to view results.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Forecast runs' })).toHaveAttribute(
      'href',
      '/forecasts/runs',
    );
  });

  it('renders backend-supported metrics, a prediction table, zero values, and missing actual data safely', async () => {
    render(
      <ForecastResultsView
        runId={FORECAST_RESULTS_RUN_ID}
        service={createForecastResultsTestService()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Forecast summary' })).toBeVisible();
    expect(screen.getAllByText('Zero-demand Widget')[0]).toBeVisible();
    expect(screen.getByRole('cell', { name: '0' })).toBeVisible();
    expect(screen.getByText('Actual data is unavailable for 1 period.')).toBeVisible();
    expect(screen.getByRole('img', { name: /Actual observations are available for 2 periods/ })).toBeVisible();
    expect(screen.getByText('MAE')).toBeVisible();
    expect(screen.getByText('RMSE')).toBeVisible();
    expect(screen.getByText('MAPE')).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: /actual/i })).not.toBeInTheDocument();
  });

  it('validates date filters and applies backend-supported product or SKU search', async () => {
    const user = userEvent.setup();
    render(
      <ForecastResultsView
        runId={FORECAST_RESULTS_RUN_ID}
        service={createForecastResultsTestService()}
      />,
    );
    await screen.findByRole('table', { name: 'Forecast predictions' });

    await user.type(screen.getByLabelText('Forecast date from'), '2026-06-04');
    await user.type(screen.getByLabelText('Forecast date to'), '2026-06-02');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(await screen.findByText('End date must be on or after the start date.')).toBeVisible();

    await user.clear(screen.getByLabelText('Forecast date from'));
    await user.clear(screen.getByLabelText('Forecast date to'));
    await user.type(screen.getByLabelText('Search product or SKU'), 'BLUE-001');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(await screen.findByText('Blue Widget')).toBeVisible();
    await waitFor(() => expect(screen.queryByText('Zero-demand Widget')).not.toBeInTheDocument());
  });

  it('renders an honest empty result state', async () => {
    render(
      <ForecastResultsView
        runId={EMPTY_FORECAST_RESULTS_DATA.overview.runId}
        service={createForecastResultsTestService({ data: EMPTY_FORECAST_RESULTS_DATA })}
      />,
    );
    expect(await screen.findByText('No forecast results available.')).toBeVisible();
  });

  it('keeps summary and prediction rows usable when only the comparison chart is unavailable', async () => {
    render(
      <ForecastResultsView
        runId={FORECAST_RESULTS_RUN_ID}
        service={createForecastResultsTestService({
          data: {
            ...FORECAST_RESULTS_DATA,
            chartError: 'Comparison data is temporarily unavailable.',
          },
        })}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Comparison data is temporarily unavailable.',
    );
    expect(screen.getByRole('heading', { name: 'Forecast summary' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Forecast predictions' })).toBeVisible();
  });

  it.each([
    [
      new ForecastResultsServiceError(
        'forecast_results_not_ready',
        'Forecast results are not available yet.',
      ),
      'Forecast results are not available yet.',
    ],
    [
      new ForecastResultsServiceError(
        'forecast_run_failed',
        'Forecast results are unavailable because the run failed.',
      ),
      'Forecast results are unavailable because the run failed.',
    ],
  ])('renders a safe terminal state', async (error, message) => {
    render(
      <ForecastResultsView
        runId={FORECAST_RESULTS_RUN_ID}
        service={createForecastResultsTestService({ error })}
      />,
    );
    expect(await screen.findByText(message)).toBeVisible();
  });

  it('keeps unsafe adapter details out of the generic error state', async () => {
    render(
      <ForecastResultsView
        runId={FORECAST_RESULTS_RUN_ID}
        service={createForecastResultsTestService({ error: new Error('database trace') })}
      />,
    );
    expect(await screen.findByText('Unable to load Forecast Results.')).toBeVisible();
    expect(screen.queryByText('database trace')).not.toBeInTheDocument();
  });

  it('shows loading before an injected result service resolves', async () => {
    let resolveData: ((data: ForecastResultsData) => void) | undefined;
    const service: ForecastResultsService = {
      getForecastResults: () =>
        new Promise<ForecastResultsData>((resolve) => {
          resolveData = resolve;
        }),
    };
    render(<ForecastResultsView runId={FORECAST_RESULTS_RUN_ID} service={service} />);

    expect(screen.getByRole('status', { name: 'Loading Forecast Results' })).toBeVisible();
    if (resolveData === undefined) {
      throw new Error('Result resolver was not initialized.');
    }
    resolveData(FORECAST_RESULTS_DATA);
    expect(await screen.findByRole('heading', { name: 'Forecast summary' })).toBeVisible();
  });
});
