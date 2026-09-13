'use client';

import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ForecastRunService } from '@/features/forecasting/api';
import { ForecastRunForm } from '@/features/forecasting/components/forecast-run-form';
import { ForecastRunStatus } from '@/features/forecasting/components/forecast-run-status';
import { useForecastRun } from '@/features/forecasting/hooks';

export interface ForecastRunViewProps {
  /** Dependency-injection seam for tests and the later Forecast Run HTTP adapter. */
  readonly service?: ForecastRunService | undefined;
}

/** Protected Module 7 content without forecast-result presentation or ML calls. */
export function ForecastRunView({ service }: ForecastRunViewProps) {
  const { state, startForecast, refreshStatus, reset } = useForecastRun(service);
  const [formVersion, setFormVersion] = useState(0);

  const startAnother = (): void => {
    reset();
    setFormVersion((version) => version + 1);
  };

  if (state.status === 'idle' || state.status === 'starting') {
    return (
      <Card aria-labelledby="forecast-run-start-title" className="max-w-2xl">
        <CardHeader>
          <CardTitle id="forecast-run-start-title" as="h2">
            Start a forecast run
          </CardTitle>
          <CardDescription>
            Create a global demand forecast run for active forecast products. This
            screen does not select products or display forecast results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastRunForm
            key={formVersion}
            isStarting={state.status === 'starting'}
            onStart={startForecast}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <ForecastRunStatus
      state={state}
      onRefresh={refreshStatus}
      onStartAnother={startAnother}
    />
  );
}
