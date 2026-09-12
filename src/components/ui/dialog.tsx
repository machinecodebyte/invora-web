'use client';

import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export interface DialogProps {
  /** Controls whether the modal is mounted. */
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('hidden'));
}

/**
 * Small modal primitive for feature-owned create/edit flows.
 *
 * It uses native dialog semantics, restores focus to the invoking control, and
 * keeps keyboard focus within the active modal. It deliberately does not own
 * feature state or form behavior.
 */
export function Dialog({ open, title, children, onClose }: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus = document.activeElement;
    dialogRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab' || dialogRef.current === null) {
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-foreground/40 p-4 sm:items-center sm:justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label={'Close ' + title}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
