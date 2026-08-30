'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { EMPTY_TOASTS, toastStore, type Toast, type ToastInput } from '@/lib/toast';

export interface UseToastResult {
  toasts: readonly Toast[];
  /** Queue a notification and return its id. */
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/**
 * Subscribe to the shared toast store.
 *
 * Any component can raise notifications without a provider in the tree; the
 * `Toaster` outlet rendered by the app shell is the single render surface.
 */
export function useToast(): UseToastResult {
  const toasts = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getState,
    () => EMPTY_TOASTS,
  );

  const toast = useCallback((input: ToastInput) => toastStore.push(input), []);
  const dismiss = useCallback((id: string) => toastStore.dismiss(id), []);
  const dismissAll = useCallback(() => toastStore.dismissAll(), []);

  return { toasts, toast, dismiss, dismissAll };
}
