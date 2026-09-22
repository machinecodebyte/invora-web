'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProductService } from '@/features/products/api';
import { useProductCatalogExtensions } from '@/features/products/hooks';
import type { ProductCategory, ProductCategoryData } from '@/features/products/types';
import { useToast } from '@/hooks/use-toast';

interface CategoryManagerProps {
  readonly service?: ProductService;
}

const EMPTY_CATEGORY_FORM = { name: '', description: '' } as const;

/** Product Catalog category management rendered inside the feature dialog. */
export function CategoryManager({ service }: CategoryManagerProps) {
  const { toast } = useToast();
  const { categories, createCategory, updateCategory, archiveCategory } =
    useProductCatalogExtensions(service);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProductCategory | null>(null);
  const [name, setName] = useState<string>(EMPTY_CATEGORY_FORM.name);
  const [description, setDescription] = useState<string>(
    EMPTY_CATEGORY_FORM.description,
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const resetForm = (): void => {
    setEditing(null);
    setName(EMPTY_CATEGORY_FORM.name);
    setDescription(EMPTY_CATEGORY_FORM.description);
    setValidationMessage(null);
  };

  const onSubmit = async (): Promise<void> => {
    const normalizedName = name.trim();
    if (normalizedName === '') {
      setValidationMessage('Category name is required.');
      return;
    }

    const input: ProductCategoryData = {
      name: normalizedName,
      description: description.trim() || null,
      ...(editing === null ? {} : { isActive: editing.isActive }),
    };

    if (editing === null) {
      await createCategory.mutateAsync(input);
      toast({ title: 'Category created', variant: 'success' });
    } else {
      await updateCategory.mutateAsync({ id: editing.id, input });
      toast({ title: 'Category updated', variant: 'success' });
    }
    resetForm();
  };

  const onArchive = async (): Promise<void> => {
    if (archiveTarget === null) {
      return;
    }
    await archiveCategory.mutateAsync(archiveTarget.id);
    toast({ title: 'Category archived', variant: 'success' });
    setArchiveTarget(null);
  };

  if (categories.isPending) {
    return <p role="status">Loading categories...</p>;
  }

  if (categories.isError) {
    return <p role="alert">Unable to load categories.</p>;
  }

  const mutationError =
    createCategory.isError || updateCategory.isError || archiveCategory.isError;

  return (
    <div className="space-y-5">
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="category-name"
          >
            Category name
          </label>
          <Input
            id="category-name"
            value={name}
            maxLength={255}
            aria-invalid={validationMessage !== null}
            aria-describedby={
              validationMessage === null ? undefined : 'category-name-error'
            }
            onChange={(event) => {
              setName(event.target.value);
              setValidationMessage(null);
            }}
            className="mt-1.5"
            required
          />
          {validationMessage === null ? null : (
            <p
              id="category-name-error"
              className="mt-1 text-sm text-danger"
              role="alert"
            >
              {validationMessage}
            </p>
          )}
        </div>
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="category-description"
          >
            Description
          </label>
          <Textarea
            id="category-description"
            value={description}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            isLoading={createCategory.isPending || updateCategory.isPending}
          >
            {editing === null ? 'Create category' : 'Save category'}
          </Button>
          {editing === null ? null : (
            <Button variant="secondary" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      {archiveTarget === null ? null : (
        <section
          className="space-y-3 rounded-lg border border-danger/40 bg-danger/5 p-4"
          aria-label="Archive category confirmation"
        >
          <p>
            Archive {archiveTarget.name}? It will remain available on existing products
            but cannot be selected for new assignments.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={archiveCategory.isPending}
              onClick={() => void onArchive()}
            >
              Archive category
            </Button>
          </div>
        </section>
      )}

      {categories.data.categories.length === 0 ? (
        <p>No categories available.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {categories.data.categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <span>
                {category.name}
                {category.isActive ? '' : ' (Archived)'}
              </span>
              <span className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={'Edit ' + category.name}
                  onClick={() => {
                    setEditing(category);
                    setName(category.name);
                    setDescription(category.description ?? '');
                    setValidationMessage(null);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={'Archive ' + category.name}
                  disabled={!category.isActive || archiveCategory.isPending}
                  onClick={() => setArchiveTarget(category)}
                >
                  Archive
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {mutationError ? <p role="alert">Unable to save category changes.</p> : null}
    </div>
  );
}
