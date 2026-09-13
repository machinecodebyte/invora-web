import { afterEach, describe, expect, it } from 'vitest';

import {
  FORECAST_RUN_E2E_STORAGE_KEY,
  createE2EForecastRunService,
  createUnavailableForecastRunService,
} from '@/features/forecasting/api';
import {
  FORECAST_RUN_PENDING,
  FORECAST_RUN_SEQUENCE,
} from '@/tests/fixtures/forecast-run';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Forecast Run service adapters', () => {
  it('keeps the normal adapter unavailable without sending a forecast request', async () => {
    const service = createUnavailableForecastRunService();

    await expect(service.startForecast({ horizonDays: 7 })).rejects.toMatchObject({
      code: 'forecast_runs_unavailable',
    });
    await expect(service.getForecastRunStatus('run-id')).rejects.toMatchObject({
      code: 'forecast_run_status_unavailable',
    });
  });

  it('reads a deterministic session-scoped lifecycle sequence only in the E2E adapter', async () => {
    window.sessionStorage.setItem(
      FORECAST_RUN_E2E_STORAGE_KEY,
      JSON.stringify({ state: 'sequence', runs: FORECAST_RUN_SEQUENCE }),
    );
    const service = createE2EForecastRunService();

    await expect(service.startForecast({ horizonDays: 15 })).resolves.toMatchObject({
      status: 'pending',
    });
    await expect(
      service.getForecastRunStatus(FORECAST_RUN_PENDING.id),
    ).resolves.toMatchObject({ status: 'running' });
    await expect(
      service.getForecastRunStatus(FORECAST_RUN_PENDING.id),
    ).resolves.toMatchObject({ status: 'completed' });
  });

  it('normalizes malformed or absent E2E fixture state into a safe failure', async () => {
    const service = createE2EForecastRunService();
    window.sessionStorage.setItem(FORECAST_RUN_E2E_STORAGE_KEY, '{not-json');

    await expect(service.startForecast({ horizonDays: 7 })).rejects.toMatchObject({
      message: 'Unable to start the forecast run.',
    });
  });
});
