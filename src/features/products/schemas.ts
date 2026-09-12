import { z } from 'zod';

import {
  PRODUCT_UNITS,
  type ProductCreateData,
  type ProductUpdateData,
} from '@/features/products/types';

const MAX_NAME_LENGTH = 255;
const MAX_SKU_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PRICE_EXCLUSIVE = 10_000_000_000;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,63}$/u;
const DECIMAL_PATTERN = /^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?$/u;

/** Mirrors Product Catalog whitespace normalization at the adapter boundary. */
export function normalizeProductText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

/** Mirrors Product Catalog SKU normalization before its pattern validation. */
export function normalizeProductSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/gu, '-')
    .replace(/^[._-]+|[._-]+$/gu, '');
}

function hasAtMostTwoDecimalPlaces(value: string): boolean {
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
  return decimalPlaces - exponent <= 2;
}

function validatePrice(value: string, context: z.RefinementCtx): void {
  const normalized = value.trim();
  if (normalized === '') {
    return;
  }
  if (!DECIMAL_PATTERN.test(normalized)) {
    context.addIssue({ code: 'custom', message: 'Enter a valid price.' });
    return;
  }

  const price = Number(normalized);
  if (!Number.isFinite(price)) {
    context.addIssue({ code: 'custom', message: 'Enter a valid price.' });
  } else if (price < 0) {
    context.addIssue({ code: 'custom', message: 'Price cannot be negative.' });
  } else if (price >= MAX_PRICE_EXCLUSIVE) {
    context.addIssue({ code: 'custom', message: 'Price is too large.' });
  } else if (!hasAtMostTwoDecimalPlaces(normalized)) {
    context.addIssue({
      code: 'custom',
      message: 'Price cannot have more than 2 decimal places.',
    });
  }
}

const productNameSchema = z.string().superRefine((value, context) => {
  const normalized = normalizeProductText(value);
  if (normalized === '') {
    context.addIssue({ code: 'custom', message: 'Product name is required.' });
  } else if (normalized.length > MAX_NAME_LENGTH) {
    context.addIssue({
      code: 'custom',
      message: 'Product name must be at most ' + MAX_NAME_LENGTH + ' characters.',
    });
  }
});

const skuSchema = z.string().superRefine((value, context) => {
  const normalized = normalizeProductSku(value);
  if (normalized === '') {
    context.addIssue({ code: 'custom', message: 'SKU is required.' });
  } else if (normalized.length > MAX_SKU_LENGTH) {
    context.addIssue({
      code: 'custom',
      message: 'SKU must be at most ' + MAX_SKU_LENGTH + ' characters.',
    });
  } else if (!SKU_PATTERN.test(normalized)) {
    context.addIssue({
      code: 'custom',
      message: 'SKU may contain only letters, numbers, dots, dashes, or underscores.',
    });
  }
});

const descriptionSchema = z.string().superRefine((value, context) => {
  if (normalizeProductText(value).length > MAX_DESCRIPTION_LENGTH) {
    context.addIssue({
      code: 'custom',
      message: 'Description must be at most ' + MAX_DESCRIPTION_LENGTH + ' characters.',
    });
  }
});

const priceSchema = z.string().superRefine(validatePrice);

/** Backend-aligned validation for the shared create/edit Product form. */
export const productFormSchema = z.object({
  name: productNameSchema,
  sku: skuSchema,
  description: descriptionSchema,
  unit: z.enum(PRODUCT_UNITS, { error: 'Select a valid unit.' }),
  sellingPrice: priceSchema,
  costPrice: priceSchema,
  status: z.enum(['active', 'inactive']),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

function toPrice(value: string, fallback: number | null): number | null {
  const normalized = value.trim();
  return normalized === '' ? fallback : Number(normalized);
}

function toBaseProductData(values: ProductFormValues): ProductCreateData {
  const description = normalizeProductText(values.description);
  return {
    name: normalizeProductText(values.name),
    sku: normalizeProductSku(values.sku),
    description: description === '' ? null : description,
    unit: values.unit,
    // The backend defaults an omitted or null selling price to zero.
    sellingPrice: toPrice(values.sellingPrice, 0) ?? 0,
    costPrice: toPrice(values.costPrice, null),
  };
}

/** Converts form strings only at the feature adapter boundary. */
export function toProductCreateData(values: ProductFormValues): ProductCreateData {
  return toBaseProductData(values);
}

/** Status maps to the backend's writable is_active update field. */
export function toProductUpdateData(values: ProductFormValues): ProductUpdateData {
  return {
    ...toBaseProductData(values),
    isActive: values.status === 'active',
  };
}
