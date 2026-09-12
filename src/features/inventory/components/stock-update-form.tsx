'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InventoryServiceError } from '@/features/inventory/api';
import {
  stockMovementFormSchema,
  toStockMovementData,
  type StockMovementFormValues,
} from '@/features/inventory/schemas';
import type {
  InventoryItem,
  StockMovementData,
  StockMovementType,
} from '@/features/inventory/types';

const MOVEMENT_DESCRIPTIONS: Readonly<Record<StockMovementType, string>> = {
  stock_in: 'Add a positive quantity to the current stock.',
  stock_out: 'Remove a positive quantity. Stock cannot be reduced below zero.',
  adjustment: 'Set the stock level to a zero-or-greater absolute quantity.',
  correction: 'Apply a non-zero positive or negative quantity correction.',
};

function toSafeSubmitError(error: unknown): string {
  return error instanceof InventoryServiceError
    ? error.message
    : 'Unable to update stock.';
}

export interface StockUpdateFormProps {
  item: InventoryItem;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: StockMovementData) => Promise<void>;
}

/** Immutable, backend-aligned stock movement form. */
export function StockUpdateForm({
  item,
  isSubmitting,
  onCancel,
  onSubmit: submitMovement,
}: StockUpdateFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<StockMovementFormValues>({
    resolver: zodResolver(stockMovementFormSchema),
    mode: 'onBlur',
    defaultValues: { movementType: 'stock_in', quantity: '', reason: '' },
  });
  const movementType = useWatch({ control, name: 'movementType' }) ?? 'stock_in';

  const onSubmit = async (values: StockMovementFormValues): Promise<void> => {
    if (isSubmitting) {
      return;
    }
    setSubmitError(null);
    try {
      await submitMovement(toStockMovementData(item.productId, values));
    } catch (error: unknown) {
      setSubmitError(toSafeSubmitError(error));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitError === null ? null : (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {submitError}
        </p>
      )}

      <div className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm">
        <p className="font-medium text-foreground">{item.product.name}</p>
        <p className="mt-1 text-foreground-muted">
          {item.product.sku} · Current stock: {item.currentStock} {item.product.unit}
        </p>
      </div>

      <div>
        <Label htmlFor="stock-movement-type" required>
          Movement type
        </Label>
        <Select
          id="stock-movement-type"
          required
          disabled={isSubmitting}
          invalid={errors.movementType !== undefined}
          aria-describedby={
            errors.movementType === undefined
              ? 'stock-movement-description'
              : 'stock-movement-type-error'
          }
          className="mt-1.5"
          {...register('movementType')}
        >
          <option value="stock_in">Stock in</option>
          <option value="stock_out">Stock out</option>
          <option value="adjustment">Adjustment</option>
          <option value="correction">Correction</option>
        </Select>
        {errors.movementType === undefined ? (
          <p
            id="stock-movement-description"
            className="mt-1.5 text-sm text-foreground-muted"
          >
            {MOVEMENT_DESCRIPTIONS[movementType]}
          </p>
        ) : (
          <p id="stock-movement-type-error" className="mt-1.5 text-sm text-danger">
            {errors.movementType.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="stock-movement-quantity" required>
          Quantity
        </Label>
        <Input
          id="stock-movement-quantity"
          inputMode="decimal"
          autoComplete="off"
          required
          disabled={isSubmitting}
          invalid={errors.quantity !== undefined}
          aria-describedby={
            errors.quantity === undefined ? undefined : 'stock-movement-quantity-error'
          }
          className="mt-1.5"
          {...register('quantity')}
        />
        {errors.quantity === undefined ? null : (
          <p id="stock-movement-quantity-error" className="mt-1.5 text-sm text-danger">
            {errors.quantity.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="stock-movement-reason">Reason</Label>
        <Textarea
          id="stock-movement-reason"
          maxLength={1000}
          disabled={isSubmitting}
          invalid={errors.reason !== undefined}
          aria-describedby={
            errors.reason === undefined
              ? 'stock-movement-reason-hint'
              : 'stock-movement-reason-error'
          }
          className="mt-1.5"
          {...register('reason')}
        />
        {errors.reason === undefined ? (
          <p
            id="stock-movement-reason-hint"
            className="mt-1.5 text-sm text-foreground-muted"
          >
            Optional. Up to 1,000 characters.
          </p>
        ) : (
          <p id="stock-movement-reason-error" className="mt-1.5 text-sm text-danger">
            {errors.reason.message}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingLabel="Recording stock update"
        >
          Update stock
        </Button>
      </div>
    </form>
  );
}
