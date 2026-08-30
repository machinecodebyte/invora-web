/**
 * Form validation plumbing shared by every feature module.
 *
 * The convention established here: declare a Zod schema per form, derive the
 * TypeScript type from it with `z.infer`, and wire it to React Hook Form via
 * {@link zodResolver}. No concrete form schema lives in the foundation - login,
 * product, inventory, upload, and settings forms belong to their own modules.
 *
 * ```ts
 * const schema = z.object({ email: z.string().email() });
 * type Values = z.infer<typeof schema>;
 * const form = useForm<Values>({ resolver: zodResolver(schema) });
 * ```
 */

import { zodResolver } from '@hookform/resolvers/zod';

import { isApiError } from '@/lib/api-error';

export { zodResolver };

/** Structural subset of React Hook Form's `setError`, kept free of RHF generics. */
export type SetFieldError = (
  name: string,
  error: { type: string; message: string },
) => void;

export interface ApplyApiValidationErrorsOptions {
  /** Field names the form actually owns; unknown fields are treated as form-level. */
  knownFields?: readonly string[];
  /** Receives messages that do not map to a specific field. */
  onFormError?: (message: string) => void;
}

/**
 * Project an {@link ApiError}'s validation details onto form fields.
 *
 * Server-side validation is authoritative, so this keeps backend feedback
 * visible next to the offending input instead of only in a toast. Issues
 * without a field - or naming a field the form does not own - are forwarded to
 * `onFormError` so they cannot be silently dropped.
 *
 * @returns `true` when at least one message was delivered.
 */
export function applyApiValidationErrors(
  error: unknown,
  setError: SetFieldError,
  options: ApplyApiValidationErrorsOptions = {},
): boolean {
  if (!isApiError(error)) {
    return false;
  }

  const { knownFields, onFormError } = options;
  let handled = false;

  for (const issue of error.details) {
    const isKnownField =
      issue.field !== null &&
      (knownFields === undefined || knownFields.includes(issue.field));

    if (isKnownField && issue.field !== null) {
      setError(issue.field, { type: 'server', message: issue.message });
      handled = true;
      continue;
    }

    if (onFormError !== undefined) {
      onFormError(issue.message);
      handled = true;
    }
  }

  if (!handled && error.isValidationError && onFormError !== undefined) {
    onFormError(error.message);
    handled = true;
  }

  return handled;
}
