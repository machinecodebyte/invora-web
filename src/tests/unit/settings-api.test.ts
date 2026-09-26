import { afterEach, describe, expect, it } from 'vitest';

import {
  SETTINGS_E2E_STORAGE_KEY,
  SettingsServiceError,
  createE2ESettingsService,
  createHttpSettingsService,
  createUnavailableSettingsService,
  mapForecastSettingsResponse,
  mapInventorySettingsResponse,
  type SettingsApiClient,
} from '@/features/settings/api';
import type { RequestConfig } from '@/lib/api-client';

const FORECAST_WIRE = {
  forecast_default_horizon_days: 15,
  forecast_min_history_days: 30,
  forecast_default_model: 'baseline',
  forecast_auto_process_enabled: false,
} as const;

const INVENTORY_WIRE = {
  inventory_default_minimum_stock: '2.000',
  inventory_default_safety_stock: '0.000',
  inventory_low_stock_alert_enabled: true,
} as const;

interface ClientCall {
  readonly method: 'GET' | 'PATCH';
  readonly path: string;
  readonly body?: Record<string, unknown> | undefined;
  readonly config?: RequestConfig | undefined;
}

function createClient(
  responses: {
    readonly forecast?: unknown;
    readonly inventory?: unknown;
    readonly failure?: Error | undefined;
  } = {},
): { readonly client: SettingsApiClient; readonly calls: ClientCall[] } {
  const calls: ClientCall[] = [];
  const forecast = responses.forecast ?? FORECAST_WIRE;
  const inventory = responses.inventory ?? INVENTORY_WIRE;

  const responseForPath = (path: string): unknown => {
    if (responses.failure !== undefined) {
      throw responses.failure;
    }
    return path === '/api/v1/settings/forecast' ? forecast : inventory;
  };

  const client: SettingsApiClient = {
    get<TResponse>(path: string, config?: RequestConfig): Promise<TResponse> {
      calls.push({ method: 'GET', path, config });
      return Promise.resolve(responseForPath(path) as TResponse);
    },
    patch<TResponse>(
      path: string,
      body?: Record<string, unknown>,
      config?: RequestConfig,
    ): Promise<TResponse> {
      calls.push({ method: 'PATCH', path, body, config });
      return Promise.resolve(responseForPath(path) as TResponse);
    },
  };

  return { client, calls };
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Settings service boundary', () => {
  it('retains an honest unavailable seam for focused failure coverage', async () => {
    const service = createUnavailableSettingsService();

    await expect(service.getSettings()).rejects.toEqual(
      new SettingsServiceError('settings_unavailable', 'Unable to load settings.'),
    );
    await expect(
      service.updateForecastDefaults({
        defaultHorizonDays: 15,
        minHistoryDays: 30,
        defaultModel: 'baseline',
        autoProcessEnabled: false,
      }),
    ).rejects.toEqual(
      new SettingsServiceError(
        'settings_save_unavailable',
        'Unable to save forecast defaults.',
      ),
    );
    await expect(
      service.updateSafetyStockDefaults({ defaultSafetyStock: '0' }),
    ).rejects.toEqual(
      new SettingsServiceError(
        'settings_save_unavailable',
        'Unable to save safety stock defaults.',
      ),
    );
  });
});

describe('Settings HTTP contract', () => {
  it('loads the two approved categories in parallel and maps snake_case data', async () => {
    const { client, calls } = createClient();
    const service = createHttpSettingsService(client);

    await expect(service.getSettings()).resolves.toEqual({
      forecastDefaults: {
        defaultHorizonDays: 15,
        minHistoryDays: 30,
        defaultModel: 'baseline',
        autoProcessEnabled: false,
      },
      safetyStockDefaults: { defaultSafetyStock: '0.000' },
    });
    expect(calls).toEqual([
      { method: 'GET', path: '/api/v1/settings/forecast', config: undefined },
      { method: 'GET', path: '/api/v1/settings/inventory', config: undefined },
    ]);
  });

  it('sends the exact Forecast category PATCH body, including false booleans', async () => {
    const { client, calls } = createClient();
    const service = createHttpSettingsService(client);

    await expect(
      service.updateForecastDefaults({
        defaultHorizonDays: 7,
        minHistoryDays: 60,
        defaultModel: 'random_forest',
        autoProcessEnabled: false,
      }),
    ).resolves.toEqual({
      defaultHorizonDays: 15,
      minHistoryDays: 30,
      defaultModel: 'baseline',
      autoProcessEnabled: false,
    });
    expect(calls).toEqual([
      {
        method: 'PATCH',
        path: '/api/v1/settings/forecast',
        body: {
          forecast_default_horizon_days: 7,
          forecast_min_history_days: 60,
          forecast_default_model: 'random_forest',
          forecast_auto_process_enabled: false,
        },
        config: undefined,
      },
    ]);
  });

  it('sends only safety stock to the Inventory category and omits hidden fields', async () => {
    const { client, calls } = createClient();
    const service = createHttpSettingsService(client);

    await expect(
      service.updateSafetyStockDefaults({ defaultSafetyStock: '12.500' }),
    ).resolves.toEqual({ defaultSafetyStock: '0.000' });
    expect(calls).toEqual([
      {
        method: 'PATCH',
        path: '/api/v1/settings/inventory',
        body: { inventory_default_safety_stock: '12.500' },
        config: undefined,
      },
    ]);
    const body = calls[0]?.body;
    expect(body).not.toHaveProperty('inventory_default_minimum_stock');
    expect(body).not.toHaveProperty('inventory_low_stock_alert_enabled');
  });

  it('rejects malformed data and normalizes load and save failures without service detail', async () => {
    expect(() =>
      mapForecastSettingsResponse({
        ...FORECAST_WIRE,
        forecast_default_horizon_days: 14,
      }),
    ).toThrow('Unable to load settings.');
    expect(() =>
      mapInventorySettingsResponse({
        ...INVENTORY_WIRE,
        inventory_default_safety_stock: '-1.000',
      }),
    ).toThrow('Unable to load settings.');

    const { client } = createClient({ failure: new Error('database trace') });
    const service = createHttpSettingsService(client);

    await expect(service.getSettings()).rejects.toEqual(
      new SettingsServiceError('settings_unavailable', 'Unable to load settings.'),
    );
    await expect(
      service.updateSafetyStockDefaults({ defaultSafetyStock: '2.000' }),
    ).rejects.toEqual(
      new SettingsServiceError(
        'settings_save_unavailable',
        'Unable to save safety stock defaults.',
      ),
    );
  });
});

describe('Settings Playwright-only adapter', () => {
  it('persists only the injected test fixture state and handles malformed fixture data safely', async () => {
    window.sessionStorage.setItem(
      SETTINGS_E2E_STORAGE_KEY,
      JSON.stringify({
        state: 'ready',
        data: {
          forecastDefaults: {
            defaultHorizonDays: 30,
            minHistoryDays: 7,
            defaultModel: 'random_forest',
            autoProcessEnabled: true,
          },
          safetyStockDefaults: { defaultSafetyStock: '1.000' },
        },
      }),
    );
    const service = createE2ESettingsService();

    await expect(
      service.updateSafetyStockDefaults({ defaultSafetyStock: '4.500' }),
    ).resolves.toEqual({ defaultSafetyStock: '4.500' });
    await expect(service.getSettings()).resolves.toMatchObject({
      forecastDefaults: { autoProcessEnabled: true },
      safetyStockDefaults: { defaultSafetyStock: '4.500' },
    });

    window.sessionStorage.setItem(SETTINGS_E2E_STORAGE_KEY, '{malformed');
    await expect(service.getSettings()).rejects.toEqual(
      new SettingsServiceError('settings_unavailable', 'Unable to load settings.'),
    );
  });
});
