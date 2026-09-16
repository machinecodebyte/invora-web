import { describe, expect, it } from 'vitest';

import {
  SettingsServiceError,
  createUnavailableSettingsService,
} from '@/features/settings/api';

describe('Settings service boundary', () => {
  it('has an honest no-network normal-runtime implementation', async () => {
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
