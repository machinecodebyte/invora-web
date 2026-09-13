'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  forecastRunFormSchema,
  toForecastRunRequest,
  type ForecastRunFormValues,
} from '@/features/forecasting/schemas';
import {
  FORECAST_HORIZONS,
  type ForecastRunRequest,
} from '@/features/forecasting/types';

const HORIZON_HINT_ID = 'forecast-run-horizon-hint';
const HORIZON_ERROR_ID = 'forecast-run-horizon-error';

export interface ForecastRunFormProps {
  readonly isStarting: boolean;
  readonly onStart: (input: ForecastRunRequest) => Promise<void>;
}

/** Backend-aligned form for the one global Forecast Run creation field. */
export function ForecastRunForm({ isStarting, onStart }: ForecastRunFormProps) {
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isValid },
  } = useForm<ForecastRunFormValues>({
    resolver: zodResolver(forecastRunFormSchema),
    mode: 'onChange',
  });

  const submit = async (values: ForecastRunFormValues): Promise<void> => {
    if (!isStarting) {
      await onStart(toForecastRunRequest(values));
    }
  };

  const horizonError = errors.horizonDays;
  const horizonField = register('horizonDays');

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      <div>
        <Label htmlFor="forecast-run-horizon" required>
          Forecast horizon
        </Label>
        <Select
          id="forecast-run-horizon"
          required
          disabled={isStarting}
          invalid={horizonError !== undefined}
          aria-describedby={
            horizonError === undefined ? HORIZON_HINT_ID : HORIZON_ERROR_ID
          }
          className="mt-1.5"
          {...horizonField}
          onBlur={(event) => {
            horizonField.onBlur(event);
            void trigger('horizonDays');
          }}
        >
          <option value="">Choose a horizon</option>
          {FORECAST_HORIZONS.map((horizon) => (
            <option key={horizon} value={String(horizon)}>
              {horizon} days
            </option>
          ))}
        </Select>
        {horizonError === undefined ? (
          <p id={HORIZON_HINT_ID} className="mt-1.5 text-sm text-foreground-muted">
            Choose how many future days the global forecast should cover.
          </p>
        ) : (
          <p id={HORIZON_ERROR_ID} role="alert" className="mt-1.5 text-sm text-danger">
            {horizonError.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={!isValid}
        isLoading={isStarting}
        loadingLabel="Starting forecast run"
      >
        Start Forecast
      </Button>
    </form>
  );
}
