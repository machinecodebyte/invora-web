'use client';

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Icon } from '@/components/ui/icon';

export interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('hidden'));
}

/** Focused, dismissible mobile presentation of the canonical app navigation. */
export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab' || dialogRef.current === null) {
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) {
      event.preventDefault();
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
      ref={dialogRef}
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Application navigation"
      onKeyDown={onDialogKeyDown}
    >
      <button
        type="button"
        aria-label="Close application navigation"
        className="absolute inset-0 bg-foreground/35"
        onClick={onClose}
      />
      <div className="relative h-full w-[min(19rem,calc(100%-2.5rem))] bg-surface shadow-2xl">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close application navigation"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="close" />
        </button>
        <AppSidebar className="w-full border-r-0 pr-14" onNavigate={onClose} />
      </div>
    </div>
  );
}
