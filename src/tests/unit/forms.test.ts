import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { applyApiValidationErrors, type SetFieldError } from '@/lib/forms';

function validationError(
  details: { field: string | null; message: string }[],
  status = 422,
): ApiError {
  const body = {
    success: false,
    error: { code: 'validation_error', message: 'Request validation failed.', details },
  };
  return ApiError.fromResponse(new Response(JSON.stringify(body), { status }), body);
}

describe('applyApiValidationErrors', () => {
  it('maps field-level issues onto form fields', () => {
    const setError = vi.fn<SetFieldError>();

    const handled = applyApiValidationErrors(
      validationError([{ field: 'email', message: 'Enter a valid email address.' }]),
      setError,
    );

    expect(handled).toBe(true);
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Enter a valid email address.',
    });
  });

  it('maps several issues in one pass', () => {
    const setError = vi.fn<SetFieldError>();

    applyApiValidationErrors(
      validationError([
        { field: 'email', message: 'Required.' },
        { field: 'password', message: 'Too short.' },
      ]),
      setError,
    );

    expect(setError).toHaveBeenCalledTimes(2);
  });

  it('routes field-less issues to the form-level handler', () => {
    const setError = vi.fn<SetFieldError>();
    const onFormError = vi.fn();

    applyApiValidationErrors(
      validationError([{ field: null, message: 'This record already exists.' }]),
      setError,
      { onFormError },
    );

    expect(setError).not.toHaveBeenCalled();
    expect(onFormError).toHaveBeenCalledWith('This record already exists.');
  });

  it('routes issues for fields the form does not own to the form-level handler', () => {
    const setError = vi.fn<SetFieldError>();
    const onFormError = vi.fn();

    applyApiValidationErrors(
      validationError([{ field: 'internal_id', message: 'Unexpected value.' }]),
      setError,
      { knownFields: ['email'], onFormError },
    );

    // Setting an error on an unregistered field would silently swallow it.
    expect(setError).not.toHaveBeenCalled();
    expect(onFormError).toHaveBeenCalledWith('Unexpected value.');
  });

  it('accepts issues for declared known fields', () => {
    const setError = vi.fn<SetFieldError>();

    applyApiValidationErrors(
      validationError([{ field: 'email', message: 'Required.' }]),
      setError,
      { knownFields: ['email', 'password'] },
    );

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Required.',
    });
  });

  it('falls back to the top-level message when a validation error carries no usable details', () => {
    const setError = vi.fn<SetFieldError>();
    const onFormError = vi.fn();

    applyApiValidationErrors(validationError([]), setError, { onFormError });

    expect(onFormError).toHaveBeenCalledWith('Request validation failed.');
  });

  it('reports nothing handled for a non-validation ApiError', () => {
    const setError = vi.fn<SetFieldError>();
    const onFormError = vi.fn();

    const handled = applyApiValidationErrors(ApiError.network(), setError, {
      onFormError,
    });

    expect(handled).toBe(false);
    expect(setError).not.toHaveBeenCalled();
    expect(onFormError).not.toHaveBeenCalled();
  });

  it('ignores values that are not ApiErrors', () => {
    const setError = vi.fn<SetFieldError>();

    expect(applyApiValidationErrors(new Error('boom'), setError)).toBe(false);
    expect(applyApiValidationErrors(null, setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('does not throw when no form-level handler is supplied', () => {
    const setError = vi.fn<SetFieldError>();

    expect(() =>
      applyApiValidationErrors(
        validationError([{ field: null, message: 'Orphan message.' }]),
        setError,
      ),
    ).not.toThrow();
  });
});
