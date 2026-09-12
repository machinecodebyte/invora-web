import { describe, expect, it } from 'vitest';

import {
  normalizeProductSku,
  normalizeProductText,
  productFormSchema,
  toProductCreateData,
  toProductUpdateData,
} from '@/features/products/schemas';

const VALID_PRODUCT = {
  name: '  Widget   Cable ',
  sku: ' wgt cable 01 ',
  description: '  Durable   cable  ',
  unit: 'pcs',
  sellingPrice: '24.50',
  costPrice: '12.25',
  status: 'active',
} as const;

describe('Product form schema', () => {
  it('accepts backend-compatible fields and normalizes at the adapter boundary', () => {
    const result = productFormSchema.safeParse(VALID_PRODUCT);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(toProductCreateData(result.data)).toEqual({
      name: 'Widget Cable',
      sku: 'WGT-CABLE-01',
      description: 'Durable cable',
      unit: 'pcs',
      sellingPrice: 24.5,
      costPrice: 12.25,
    });
  });

  it('rejects missing name, invalid normalized SKU, and unsupported units', () => {
    const result = productFormSchema.safeParse({
      ...VALID_PRODUCT,
      name: '   ',
      sku: 'SKU / 01',
      unit: 'carton',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['name', 'sku', 'unit']),
    );
  });

  it('mirrors non-negative, two-decimal backend price validation', () => {
    const negative = productFormSchema.safeParse({
      ...VALID_PRODUCT,
      sellingPrice: '-1',
    });
    const fractional = productFormSchema.safeParse({
      ...VALID_PRODUCT,
      costPrice: '12.345',
    });
    const tooLarge = productFormSchema.safeParse({
      ...VALID_PRODUCT,
      sellingPrice: '10000000000',
    });

    expect(negative.success).toBe(false);
    expect(fractional.success).toBe(false);
    expect(tooLarge.success).toBe(false);
  });

  it('keeps a blank optional cost price null and maps editable status safely', () => {
    const result = productFormSchema.parse({
      ...VALID_PRODUCT,
      costPrice: '',
      sellingPrice: '',
      status: 'inactive',
    });

    expect(toProductUpdateData(result)).toEqual({
      name: 'Widget Cable',
      sku: 'WGT-CABLE-01',
      description: 'Durable cable',
      unit: 'pcs',
      sellingPrice: 0,
      costPrice: null,
      isActive: false,
    });
  });

  it('exposes the same text and SKU normalization that the backend expects', () => {
    expect(normalizeProductText('  Product   name  ')).toBe('Product name');
    expect(normalizeProductSku(' __ widget   sku __ ')).toBe('WIDGET-SKU');
  });
});
