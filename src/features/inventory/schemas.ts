import { z } from 'zod';

import {
  STOCK_MOVEMENT_TYPES,
  type StockMovementData,
} from '@/features/inventory/types';

const MAX_STOCK_QUANTITY_EXCLUSIVE = 100_000_000_000;
const MAX_REASON_LENGTH = 1000;
const DECIMAL_PATTERN = /^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?$/u;

function hasAtMostThreeDecimalPlaces(value: string): boolean {
  const match =
    /^(?<coefficient>[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+)))(?:[eE](?<exponent>[+-]?\d+))?$/u.exec(
      value,
    );
  const coefficient = match?.groups?.coefficient;
  if (coefficient === undefined) {
    return false;
  }

  const exponent = Number(match?.groups?.exponent ?? '0');
  if (!Number.isSafeInteger(exponent)) {
    return false;
  }

  const decimalPlaces = coefficient.split('.')[1]?.length ?? 0;
  return decimalPlaces - exponent <= 3;
}

function validateQuantity(
  value: string,
  movementType: StockMovementData['movementType'],
  context: z.RefinementCtx,
): void {
  const normalized = value.trim();
  if (normalized === '') {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Quantity is required.',
    });
    return;
  }
  if (!DECIMAL_PATTERN.test(normalized)) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Enter a valid quantity.',
    });
    return;
  }

  const quantity = Number(normalized);
  if (!Number.isFinite(quantity)) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Enter a valid quantity.',
    });
    return;
  }
  if (!hasAtMostThreeDecimalPlaces(normalized)) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Quantity cannot have more than 3 decimal places.',
    });
    return;
  }
  if (Math.abs(quantity) >= MAX_STOCK_QUANTITY_EXCLUSIVE) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Quantity is too large.',
    });
    return;
  }

  if (movementType === 'adjustment' && quantity < 0) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Stock level cannot be negative.',
    });
  } else if (
    (movementType === 'stock_in' || movementType === 'stock_out') &&
    quantity <= 0
  ) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Quantity must be greater than zero.',
    });
  } else if (movementType === 'correction' && quantity === 0) {
    context.addIssue({
      code: 'custom',
      path: ['quantity'],
      message: 'Correction quantity cannot be zero.',
    });
  }
}

/** Backend-aligned validation for immutable Inventory stock movements. */
export const stockMovementFormSchema = z
  .object({
    movementType: z.enum(STOCK_MOVEMENT_TYPES, {
      error: 'Select a valid stock movement type.',
    }),
    quantity: z.string(),
    reason: z.string(),
  })
  .superRefine((values, context) => {
    validateQuantity(values.quantity, values.movementType, context);
    if (values.reason.trim().length > MAX_REASON_LENGTH) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Reason must be at most ' + MAX_REASON_LENGTH + ' characters.',
      });
    }
  });

export type StockMovementFormValues = z.infer<typeof stockMovementFormSchema>;

/** Normalizes optional UI-only whitespace without changing decimal text. */
export function toStockMovementData(
  productId: string,
  values: StockMovementFormValues,
): StockMovementData {
  const reason = values.reason.trim().replace(/\s+/gu, ' ');
  return {
    productId,
    movementType: values.movementType,
    quantity: values.quantity.trim(),
    reason: reason === '' ? null : reason,
  };
}
