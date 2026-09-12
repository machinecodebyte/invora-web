'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductServiceError } from '@/features/products/api';
import {
  productFormSchema,
  toProductCreateData,
  toProductUpdateData,
  type ProductFormValues,
} from '@/features/products/schemas';
import {
  PRODUCT_UNITS,
  type Product,
  type ProductCreateData,
  type ProductUpdateData,
} from '@/features/products/types';

type ProductFormProps =
  | {
      readonly mode: 'create';
      readonly isSubmitting: boolean;
      readonly onCancel: () => void;
      readonly onSubmit: (input: ProductCreateData) => Promise<void>;
    }
  | {
      readonly mode: 'edit';
      readonly product: Product;
      readonly isSubmitting: boolean;
      readonly onCancel: () => void;
      readonly onSubmit: (input: ProductUpdateData) => Promise<void>;
    };

function toFormValues(
  mode: ProductFormProps['mode'],
  product?: Product,
): ProductFormValues {
  if (mode === 'edit' && product !== undefined) {
    return {
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      unit: product.unit,
      sellingPrice: String(product.sellingPrice),
      costPrice: product.costPrice === null ? '' : String(product.costPrice),
      status: product.isActive ? 'active' : 'inactive',
    };
  }

  return {
    name: '',
    sku: '',
    description: '',
    unit: 'pcs',
    sellingPrice: '0',
    costPrice: '',
    status: 'active',
  };
}

function toSafeSubmitError(error: unknown, mode: ProductFormProps['mode']): string {
  if (error instanceof ProductServiceError) {
    return error.message;
  }
  return mode === 'create'
    ? 'Unable to create the product.'
    : 'Unable to update the product.';
}

/** Shared validated Product Catalog create/edit form. */
export function ProductForm(props: ProductFormProps) {
  const { mode, isSubmitting, onCancel } = props;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const product = mode === 'edit' ? props.product : undefined;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onBlur',
    defaultValues: toFormValues(mode, product),
  });

  const onSubmit = async (values: ProductFormValues): Promise<void> => {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        await props.onSubmit(toProductCreateData(values));
      } else {
        await props.onSubmit(toProductUpdateData(values));
      }
    } catch (error: unknown) {
      setSubmitError(toSafeSubmitError(error, mode));
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="product-name" required>
            Name
          </Label>
          <Input
            id="product-name"
            autoComplete="off"
            required
            disabled={isSubmitting}
            invalid={errors.name !== undefined}
            aria-describedby={
              errors.name === undefined ? undefined : 'product-name-error'
            }
            className="mt-1.5"
            {...register('name')}
          />
          {errors.name === undefined ? null : (
            <p id="product-name-error" className="mt-1.5 text-sm text-danger">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="product-sku" required>
            SKU
          </Label>
          <Input
            id="product-sku"
            autoComplete="off"
            required
            disabled={isSubmitting}
            invalid={errors.sku !== undefined}
            aria-describedby={
              errors.sku === undefined ? undefined : 'product-sku-error'
            }
            className="mt-1.5"
            {...register('sku')}
          />
          {errors.sku === undefined ? null : (
            <p id="product-sku-error" className="mt-1.5 text-sm text-danger">
              {errors.sku.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="product-description">Description</Label>
        <Textarea
          id="product-description"
          disabled={isSubmitting}
          invalid={errors.description !== undefined}
          aria-describedby={
            errors.description === undefined ? undefined : 'product-description-error'
          }
          className="mt-1.5"
          {...register('description')}
        />
        {errors.description === undefined ? null : (
          <p id="product-description-error" className="mt-1.5 text-sm text-danger">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <Label htmlFor="product-unit" required>
            Unit
          </Label>
          <Select
            id="product-unit"
            required
            disabled={isSubmitting}
            invalid={errors.unit !== undefined}
            aria-describedby={
              errors.unit === undefined ? undefined : 'product-unit-error'
            }
            className="mt-1.5"
            {...register('unit')}
          >
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
          {errors.unit === undefined ? null : (
            <p id="product-unit-error" className="mt-1.5 text-sm text-danger">
              {errors.unit.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="product-selling-price">Selling price</Label>
          <Input
            id="product-selling-price"
            inputMode="decimal"
            autoComplete="off"
            disabled={isSubmitting}
            invalid={errors.sellingPrice !== undefined}
            aria-describedby={
              errors.sellingPrice === undefined
                ? undefined
                : 'product-selling-price-error'
            }
            className="mt-1.5"
            {...register('sellingPrice')}
          />
          {errors.sellingPrice === undefined ? null : (
            <p id="product-selling-price-error" className="mt-1.5 text-sm text-danger">
              {errors.sellingPrice.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="product-cost-price">Cost price</Label>
          <Input
            id="product-cost-price"
            inputMode="decimal"
            autoComplete="off"
            disabled={isSubmitting}
            invalid={errors.costPrice !== undefined}
            aria-describedby={
              errors.costPrice === undefined ? undefined : 'product-cost-price-error'
            }
            className="mt-1.5"
            {...register('costPrice')}
          />
          {errors.costPrice === undefined ? null : (
            <p id="product-cost-price-error" className="mt-1.5 text-sm text-danger">
              {errors.costPrice.message}
            </p>
          )}
        </div>
      </div>

      {mode !== 'edit' ? null : (
        <div>
          <Label htmlFor="product-status">Status</Label>
          <Select
            id="product-status"
            disabled={isSubmitting}
            invalid={errors.status !== undefined}
            aria-describedby={
              errors.status === undefined ? undefined : 'product-status-error'
            }
            className="mt-1.5"
            {...register('status')}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          {errors.status === undefined ? null : (
            <p id="product-status-error" className="mt-1.5 text-sm text-danger">
              {errors.status.message}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingLabel={mode === 'create' ? 'Creating product' : 'Saving product'}
        >
          {mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
