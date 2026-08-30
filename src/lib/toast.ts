import { DEFAULT_TOAST_DURATION_MS } from '@/lib/constants';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  title: string;
  description: string | null;
  variant: ToastVariant;
}

/** Caller-supplied toast fields; `id` is assigned by the store. */
export interface ToastInput {
  title: string;
  description?: string | null;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. `0` keeps the toast until dismissed manually. */
  duration?: number;
}

export interface ToastStore {
  getState(): readonly Toast[];
  subscribe(listener: () => void): () => void;
  /** Queue a toast and return its id. */
  push(input: ToastInput): string;
  dismiss(id: string): void;
  dismissAll(): void;
}

/**
 * Framework-agnostic toast store.
 *
 * Kept outside React so any layer (including non-component code such as an
 * error boundary or a mutation callback) can raise a notification, and so the
 * behaviour is unit-testable without rendering.
 */
export function createToastStore(): ToastStore {
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  let toasts: readonly Toast[] = [];
  let sequence = 0;

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function clearTimer(id: string): void {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function dismiss(id: string): void {
    clearTimer(id);
    const next = toasts.filter((toast) => toast.id !== id);
    if (next.length === toasts.length) {
      return;
    }
    toasts = next;
    emit();
  }

  return {
    getState: () => toasts,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push: (input) => {
      sequence += 1;
      const id = `toast-${sequence}`;
      const toast: Toast = {
        id,
        title: input.title,
        description: input.description ?? null,
        variant: input.variant ?? 'info',
      };

      toasts = [...toasts, toast];
      emit();

      const duration = input.duration ?? DEFAULT_TOAST_DURATION_MS;
      if (duration > 0) {
        timers.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }

      return id;
    },
    dismiss,
    dismissAll: () => {
      for (const id of [...timers.keys()]) {
        clearTimer(id);
      }
      if (toasts.length === 0) {
        return;
      }
      toasts = [];
      emit();
    },
  };
}

/** Shared store backing the `useToast` hook and the `Toaster` outlet. */
export const toastStore = createToastStore();

/** Empty snapshot used during server rendering; a stable reference is required. */
export const EMPTY_TOASTS: readonly Toast[] = Object.freeze([]);
