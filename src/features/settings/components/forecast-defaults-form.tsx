'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  forecastDefaultsFormSchema,
  toForecastDefaults,
  toForecastDefaultsFormValues,
  type ForecastDefaultsFormValues,
} from '@/features/settings/schemas';
import type { ForecastDefaults } from '@/features/settings/types';

const HORIZON_ERROR_ID = 'settings-forecast-horizon-error';
const HISTORY_ERROR_ID = 'settings-forecast-history-error';
const MODEL_ERROR_ID = 'settings-forecast-model-error';

type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'success' }
  | { readonly status: 'error'; readonly message: string };

export interface ForecastDefaultsFormProps {
  readonly defaults: ForecastDefaults;
  readonly onSave: (defaults: ForecastDefaults) => Promise<ForecastDefaults>;
}

/** Independent form because the backend persists its forecast category separately. */
export function ForecastDefaultsForm({ defaults, onSave }: ForecastDefaultsFormProps) {
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const initialValues = toForecastDefaultsFormValues(defaults);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<ForecastDefaultsFormValues>({
    resolver: zodResolver(forecastDefaultsFormSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });

  useEffect(() => {
    reset(toForecastDefaultsFormValues(defaults));
  }, [defaults, reset]);

  const isSaving = saveState.status === 'saving';
  const horizonField = register('defaultHorizonDays');
  const historyField = register('minHistoryDays');
  const modelField = register('defaultModel');
  const autoProcessField = register('autoProcessEnabled');

  const submit = async (values: ForecastDefaultsFormValues): Promise<void> => {
    if (isSaving) {
      return;
    }

    setSaveState({ status: 'saving' });
    try {
      const saved = await onSave(toForecastDefaults(values));
      reset(toForecastDefaultsFormValues(saved));
      setSaveState({ status: 'success' });
    } catch (error: unknown) {
      setSaveState({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to save forecast defaults.',
      });
    }
  };

  const revert = (): void => {
    reset(toForecastDefaultsFormValues(defaults));
    setSaveState({ status: 'idle' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Forecast Defaults</CardTitle>
        <CardDescription>
          Choose the values prefilled for future forecast configuration. Existing
          forecast runs are not changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
          <div>
            <Label htmlFor="settings-forecast-horizon" required>
              Default forecast horizon
            </Label>
            <Select
              id="settings-forecast-horizon"
              required
              disabled={isSaving}
              invalid={errors.defaultHorizonDays !== undefined}
              aria-describedby={
                errors.defaultHorizonDays === undefined ? undefined : HORIZON_ERROR_ID
              }
              className="mt-1.5"
              {...horizonField}
            >
              <option value="7">7 days</option>
              <option value="15">15 days</option>
              <option value="30">30 days</option>
            </Select>
            {errors.defaultHorizonDays === undefined ? null : (
              <p
                id={HORIZON_ERROR_ID}
                role="alert"
                className="mt-1.5 text-sm text-danger"
              >
                {errors.defaultHorizonDays.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="settings-forecast-history" required>
              Minimum history window (days)
            </Label>
            <Input
              id="settings-forecast-history"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              disabled={isSaving}
              invalid={errors.minHistoryDays !== undefined}
              aria-describedby={
                errors.minHistoryDays === undefined ? undefined : HISTORY_ERROR_ID
              }
              className="mt-1.5"
              {...historyField}
            />
            {errors.minHistoryDays === undefined ? (
              <p className="mt-1.5 text-sm text-foreground-muted">
                Use a whole number from 1 to 365.
              </p>
            ) : (
              <p
                id={HISTORY_ERROR_ID}
                role="alert"
                className="mt-1.5 text-sm text-danger"
              >
                {errors.minHistoryDays.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="settings-forecast-model" required>
              Default forecast model
            </Label>
            <Select
              id="settings-forecast-model"
              required
              disabled={isSaving}
              invalid={errors.defaultModel !== undefined}
              aria-describedby={
                errors.defaultModel === undefined ? undefined : MODEL_ERROR_ID
              }
              className="mt-1.5"
              {...modelField}
            >
              <option value="random_forest">Random forest</option>
              <option value="baseline">Baseline</option>
            </Select>
            {errors.defaultModel === undefined ? null : (
              <p
                id={MODEL_ERROR_ID}
                role="alert"
                className="mt-1.5 text-sm text-danger"
              >
                {errors.defaultModel.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              id="settings-forecast-auto-process"
              type="checkbox"
              disabled={isSaving}
              className="mt-0.5 size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              {...autoProcessField}
            />
            <div>
              <Label htmlFor="settings-forecast-auto-process">
                Automatically process new forecast runs
              </Label>
              <p className="mt-1 text-sm text-foreground-muted">
                Use the backend-supported auto-processing default for future runs.
              </p>
            </div>
          </div>

          {saveState.status === 'success' ? (
            <p role="status" className="text-sm text-success">
              Forecast defaults saved.
            </p>
          ) : null}
          {saveState.status === 'error' ? (
            <p role="alert" className="text-sm text-danger">
              {saveState.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={!isDirty || !isValid}
              isLoading={isSaving}
              loadingLabel="Saving forecast defaults"
            >
              Save forecast defaults
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!isDirty || isSaving}
              onClick={revert}
            >
              Revert forecast changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
