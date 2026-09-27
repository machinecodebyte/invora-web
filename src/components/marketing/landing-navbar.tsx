'use client';

import Link from 'next/link';
import { useState } from 'react';

import { InvoraMark } from '@/components/brand/invora-mark';
import { buttonClassName } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const LANDING_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#insights', label: 'Insights' },
  { href: '#faq', label: 'FAQ' },
] as const;

/** Interactive island for public navigation; the landing content stays server rendered. */
export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  const close = (): void => {
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link href={ROUTES.home} className="rounded-lg focus-visible:outline-none">
          <InvoraMark />
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {LANDING_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href={ROUTES.login}
            className={buttonClassName({ variant: 'ghost', size: 'sm' })}
          >
            Log in
          </Link>
          <Link href={ROUTES.register} className={buttonClassName({ size: 'sm' })}>
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          aria-controls="landing-mobile-menu"
          aria-expanded={open}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </nav>

      <div
        id="landing-mobile-menu"
        className={cn(
          'border-t border-border bg-surface px-4 pb-5 pt-3 shadow-lg sm:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          {LANDING_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={close}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Link
              href={ROUTES.login}
              onClick={close}
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Log in
            </Link>
            <Link
              href={ROUTES.register}
              onClick={close}
              className={buttonClassName({ size: 'sm' })}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
