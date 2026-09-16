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
import {
  safetyStockDefaultsFormSchema,
  toSafetyStockDefaults,
  toSafetyStockDefaultsFormValues,
  type SafetyStockDefaultsFormValues,
} from '@/features/settings/schemas';
import type { SafetyStockDefaults } from '@/features/settings/types';

const SAFETY_STOCK_ERROR_ID = 'settings-safety-stock-error';

type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'success' }
  | { readonly status: 'error'; readonly message: string };

export interface SafetyStockDefaultsFormProps {
  readonly defaults: SafetyStockDefaults;
  readonly onSave: (defaults: SafetyStockDefaults) => Promise<SafetyStockDefaults>;
}

/** Independent form for the backend's absolute Decimal inventory safety-stock default. */
export function SafetyStockDefaultsForm({
  defaults,
  onSave,
}: SafetyStockDefaultsFormProps) {
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<SafetyStockDefaultsFormValues>({
    resolver: zodResolver(safetyStockDefaultsFormSchema),
    defaultValues: toSafetyStockDefaultsFormValues(defaults),
    mode: 'onChange',
  });

  useEffect(() => {
    reset(toSafetyStockDefaultsFormValues(defaults));
  }, [defaults, reset]);

  const isSaving = saveState.status === 'saving';
  const safetyStockField = register('defaultSafetyStock');

  const submit = async (values: SafetyStockDefaultsFormValues): Promise<void> => {
    if (isSaving) {
      return;
    }

    setSaveState({ status: 'saving' });
    try {
      const saved = await onSave(toSafetyStockDefaults(values));
      reset(toSafetyStockDefaultsFormValues(saved));
      setSaveState({ status: 'success' });
    } catch (error: unknown) {
      setSaveState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save safety stock defaults.',
      });
    }
  };

  const revert = (): void => {
    reset(toSafetyStockDefaultsFormValues(defaults));
    setSaveState({ status: 'idle' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Safety Stock Defaults</CardTitle>
        <CardDescription>
          Set the absolute safety-stock quantity prefilled for future inventory setup.
          Existing stock and recommendations are not recalculated here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
          <div>
            <Label htmlFor="settings-safety-stock" required>
              Default safety stock quantity
            </Label>
            <Input
              id="settings-safety-stock"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              disabled={isSaving}
              invalid={errors.defaultSafetyStock !== undefined}
              aria-describedby={
                errors.defaultSafetyStock === undefined
                  ? undefined
                  : SAFETY_STOCK_ERROR_ID
              }
              className="mt-1.5"
              {...safetyStockField}
            />
            {errors.defaultSafetyStock === undefined ? (
              <p className="mt-1.5 text-sm text-foreground-muted">
                Enter an absolute quantity from 0 to 99,999,999,999.999.
              </p>
            ) : (
              <p
                id={SAFETY_STOCK_ERROR_ID}
                role="alert"
                className="mt-1.5 text-sm text-danger"
              >
                {errors.defaultSafetyStock.message}
              </p>
            )}
          </div>

          {saveState.status === 'success' ? (
            <p role="status" className="text-sm text-success">
              Safety stock defaults saved.
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
              loadingLabel="Saving safety stock defaults"
            >
              Save safety stock defaults
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!isDirty || isSaving}
              onClick={revert}
            >
              Revert safety stock changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
