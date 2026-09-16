'use client';

import { ErrorState } from '@/components/ui/error-state';
import type { SettingsService } from '@/features/settings/api';
import { ForecastDefaultsForm } from '@/features/settings/components/forecast-defaults-form';
import { SafetyStockDefaultsForm } from '@/features/settings/components/safety-stock-defaults-form';
import { SettingsSkeleton } from '@/features/settings/components/settings-skeleton';
import { useSettings } from '@/features/settings/hooks';

export interface SettingsViewProps {
  /** Dependency-injection seam for component tests and the future HTTP adapter. */
  readonly service?: SettingsService | undefined;
}

/** Module 11 composition for the two approved Settings categories only. */
export function SettingsView({ service }: SettingsViewProps) {
  const { state, reload, updateForecastDefaults, updateSafetyStockDefaults } =
    useSettings(service);

  if (state.status === 'loading') {
    return <SettingsSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title={state.message}
        description="Settings are unavailable until their configured data source responds."
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-foreground-muted">
        Defaults apply to future configuration only. Saving one section does not alter
        the other section or change existing operational data.
      </p>
      <ForecastDefaultsForm
        defaults={state.data.forecastDefaults}
        onSave={updateForecastDefaults}
      />
      <SafetyStockDefaultsForm
        defaults={state.data.safetyStockDefaults}
        onSave={updateSafetyStockDefaults}
      />
    </div>
  );
}
