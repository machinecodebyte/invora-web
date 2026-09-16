import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SettingsServiceError, type SettingsService } from '@/features/settings/api';
import { SettingsView } from '@/features/settings/components/settings-view';
import type { SettingsData } from '@/features/settings/types';
import {
  SETTINGS_FIXTURE,
  createSettingsTestService,
  unavailableSettingsFixtureError,
} from '@/tests/fixtures/settings';

describe('SettingsView', () => {
  it('renders both approved settings categories, accessible controls, and a valid zero default', async () => {
    render(<SettingsView service={createSettingsTestService()} />);

    expect(
      await screen.findByRole('heading', { name: 'Forecast Defaults' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Safety Stock Defaults' }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Default forecast horizon/u)).toHaveValue('15');
    expect(screen.getByLabelText(/Minimum history window \(days\)/u)).toHaveValue('30');
    expect(screen.getByLabelText(/Default safety stock quantity/u)).toHaveValue(
      '0.000',
    );
    expect(
      screen.getByRole('checkbox', { name: 'Automatically process new forecast runs' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Save forecast defaults' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save safety stock defaults' }),
    ).toBeDisabled();
  });

  it('saves a dirty Forecast Defaults form with backend-aligned normalized values', async () => {
    const user = userEvent.setup();
    const onForecastUpdate = vi.fn();
    render(<SettingsView service={createSettingsTestService({ onForecastUpdate })} />);
    await screen.findByRole('heading', { name: 'Forecast Defaults' });

    await user.selectOptions(screen.getByLabelText(/Default forecast horizon/u), '30');
    await user.clear(screen.getByLabelText(/Minimum history window \(days\)/u));
    await user.type(screen.getByLabelText(/Minimum history window \(days\)/u), '60');
    await user.selectOptions(
      screen.getByLabelText(/Default forecast model/u),
      'random_forest',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Automatically process new forecast runs' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save forecast defaults' }));

    expect(await screen.findByText('Forecast defaults saved.')).toBeVisible();
    expect(onForecastUpdate).toHaveBeenCalledWith({
      defaultHorizonDays: 30,
      minHistoryDays: 60,
      defaultModel: 'random_forest',
      autoProcessEnabled: true,
    });
    expect(
      screen.getByRole('button', { name: 'Save forecast defaults' }),
    ).toBeDisabled();
  });

  it('validates history and safety-stock input while accepting and saving zero', async () => {
    const user = userEvent.setup();
    const onSafetyStockUpdate = vi.fn();
    render(
      <SettingsView service={createSettingsTestService({ onSafetyStockUpdate })} />,
    );
    await screen.findByRole('heading', { name: 'Forecast Defaults' });

    const history = screen.getByLabelText(/Minimum history window \(days\)/u);
    await user.clear(history);
    await user.type(history, '366');
    expect(
      await screen.findByText('Enter a whole number from 1 to 365 days.'),
    ).toBeVisible();
    expect(history).toHaveAttribute('aria-invalid', 'true');

    const safetyStock = screen.getByLabelText(/Default safety stock quantity/u);
    await user.clear(safetyStock);
    await user.type(safetyStock, '1.2345');
    expect(
      await screen.findByText(
        'Enter a non-negative quantity with up to 3 decimal places.',
      ),
    ).toBeVisible();
    expect(safetyStock).toHaveAttribute('aria-invalid', 'true');

    await user.clear(safetyStock);
    await user.type(safetyStock, '0');
    await user.click(
      screen.getByRole('button', { name: 'Save safety stock defaults' }),
    );
    expect(await screen.findByText('Safety stock defaults saved.')).toBeVisible();
    expect(onSafetyStockUpdate).toHaveBeenCalledWith({ defaultSafetyStock: '0' });
  });

  it('reverts dirty values to the latest loaded category without saving', async () => {
    const user = userEvent.setup();
    const onSafetyStockUpdate = vi.fn();
    render(
      <SettingsView service={createSettingsTestService({ onSafetyStockUpdate })} />,
    );
    const safetyStock = await screen.findByLabelText(/Default safety stock quantity/u);

    await user.clear(safetyStock);
    await user.type(safetyStock, '12.500');
    expect(
      screen.getByRole('button', { name: 'Revert safety stock changes' }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole('button', { name: 'Revert safety stock changes' }),
    );

    expect(safetyStock).toHaveValue('0.000');
    expect(onSafetyStockUpdate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Save safety stock defaults' }),
    ).toBeDisabled();
  });

  it('prevents duplicate save while pending and completes with safe feedback', async () => {
    const user = userEvent.setup();
    let resolveSave: ((defaults: SettingsData['forecastDefaults']) => void) | undefined;
    const forecastUpdateResult = new Promise<SettingsData['forecastDefaults']>(
      (resolve) => {
        resolveSave = resolve;
      },
    );
    const onForecastUpdate = vi.fn();
    render(
      <SettingsView
        service={createSettingsTestService({ forecastUpdateResult, onForecastUpdate })}
      />,
    );
    await screen.findByRole('heading', { name: 'Forecast Defaults' });

    await user.selectOptions(screen.getByLabelText(/Default forecast horizon/u), '7');
    const saveButton = screen.getByRole('button', { name: 'Save forecast defaults' });
    await user.click(saveButton);
    await user.click(saveButton);
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute('aria-busy', 'true');
    expect(onForecastUpdate).toHaveBeenCalledTimes(1);

    if (resolveSave === undefined) {
      throw new Error('Expected forecast update resolver to be initialized.');
    }
    resolveSave({
      defaultHorizonDays: 7,
      minHistoryDays: 30,
      defaultModel: 'baseline',
      autoProcessEnabled: false,
    });
    expect(await screen.findByText('Forecast defaults saved.')).toBeVisible();
  });

  it('normalizes unknown errors and retains a safe service error for a save retry', async () => {
    const user = userEvent.setup();
    const saveService = createSettingsTestService({
      safetyStockUpdateError: new Error('database trace'),
    });
    render(<SettingsView service={saveService} />);
    const safetyStock = await screen.findByLabelText(/Default safety stock quantity/u);
    await user.clear(safetyStock);
    await user.type(safetyStock, '5');
    await user.click(
      screen.getByRole('button', { name: 'Save safety stock defaults' }),
    );
    expect(
      await screen.findByText('Unable to save safety stock defaults.'),
    ).toBeVisible();
    expect(screen.queryByText('database trace')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save safety stock defaults' }),
    ).toBeEnabled();

    const initialLoad = render(<SettingsView service={createSettingsTestService()} />);
    await screen.findAllByRole('heading', { name: 'Forecast Defaults' });
    initialLoad.unmount();
    const initialError = render(<SettingsView service={createSettingsTestService()} />);
    await screen.findByRole('heading', { name: 'Forecast Defaults' });
    initialError.rerender(
      <SettingsView
        service={createSettingsTestService({
          getSettingsError: unavailableSettingsFixtureError(),
        })}
      />,
    );
    expect(
      await screen.findByText('Settings are temporarily unavailable.'),
    ).toBeVisible();
  });

  it('shows an initialization state and normalizes an unknown initial-load error', async () => {
    let resolveSettings: ((data: SettingsData) => void) | undefined;
    const loadingService: SettingsService = {
      getSettings: () =>
        new Promise<SettingsData>((resolve) => {
          resolveSettings = resolve;
        }),
      updateForecastDefaults: (defaults) => Promise.resolve(defaults),
      updateSafetyStockDefaults: (defaults) => Promise.resolve(defaults),
    };
    const { rerender } = render(<SettingsView service={loadingService} />);
    expect(screen.getByRole('status', { name: 'Loading settings' })).toBeVisible();
    if (resolveSettings === undefined) {
      throw new Error('Expected settings resolver to be initialized.');
    }
    resolveSettings(SETTINGS_FIXTURE);
    expect(
      await screen.findByRole('heading', { name: 'Forecast Defaults' }),
    ).toBeVisible();

    rerender(
      <SettingsView
        service={createSettingsTestService({
          getSettingsError: new Error('server internals'),
        })}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText('Unable to load settings.')).toBeVisible(),
    );
    expect(screen.queryByText('server internals')).not.toBeInTheDocument();
  });

  it('keeps explicit safe service messages for the initial-load error state', async () => {
    render(
      <SettingsView
        service={createSettingsTestService({
          getSettingsError: new SettingsServiceError(
            'settings_unavailable',
            'Settings are temporarily unavailable.',
          ),
        })}
      />,
    );

    expect(
      await screen.findByText('Settings are temporarily unavailable.'),
    ).toBeVisible();
  });
});
