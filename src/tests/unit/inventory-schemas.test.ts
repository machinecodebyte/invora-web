import { describe, expect, it } from 'vitest';

import {
  stockMovementFormSchema,
  toStockMovementData,
} from '@/features/inventory/schemas';

describe('stockMovementFormSchema', () => {
  it('accepts each backend-aligned public movement quantity shape', () => {
    expect(
      stockMovementFormSchema.safeParse({
        movementType: 'stock_in',
        quantity: '2.500',
        reason: '',
      }).success,
    ).toBe(true);
    expect(
      stockMovementFormSchema.safeParse({
        movementType: 'stock_out',
        quantity: '1',
        reason: '',
      }).success,
    ).toBe(true);
    expect(
      stockMovementFormSchema.safeParse({
        movementType: 'adjustment',
        quantity: '0',
        reason: '',
      }).success,
    ).toBe(true);
    expect(
      stockMovementFormSchema.safeParse({
        movementType: 'correction',
        quantity: '-1.250',
        reason: '',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid zero and negative quantities by movement semantics', () => {
    const stockIn = stockMovementFormSchema.safeParse({
      movementType: 'stock_in',
      quantity: '-1',
      reason: '',
    });
    const stockOut = stockMovementFormSchema.safeParse({
      movementType: 'stock_out',
      quantity: '0',
      reason: '',
    });
    const adjustment = stockMovementFormSchema.safeParse({
      movementType: 'adjustment',
      quantity: '-0.001',
      reason: '',
    });
    const correction = stockMovementFormSchema.safeParse({
      movementType: 'correction',
      quantity: '0',
      reason: '',
    });

    expect(stockIn.success).toBe(false);
    expect(stockOut.success).toBe(false);
    expect(adjustment.success).toBe(false);
    expect(correction.success).toBe(false);
  });

  it('rejects over-precise, oversized, and non-numeric quantities', () => {
    for (const quantity of ['1.0001', '100000000000', 'inventory']) {
      expect(
        stockMovementFormSchema.safeParse({
          movementType: 'stock_in',
          quantity,
          reason: '',
        }).success,
      ).toBe(false);
    }
  });

  it('normalizes optional reason text while retaining decimal transport text', () => {
    const values = stockMovementFormSchema.parse({
      movementType: 'correction',
      quantity: ' -1.250 ',
      reason: '  Count   correction  ',
    });

    expect(toStockMovementData('product-1', values)).toEqual({
      productId: 'product-1',
      movementType: 'correction',
      quantity: '-1.250',
      reason: 'Count correction',
    });
  });
});
