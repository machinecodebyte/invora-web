'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { InvoraMark } from '@/components/brand/invora-mark';
import {
  APP_NAVIGATION,
  isAppNavigationItemActive,
} from '@/components/layout/app-navigation';
import { Icon } from '@/components/ui/icon';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

/** Shared authenticated navigation for desktop and the mobile drawer. */
export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-full w-72 flex-col border-r border-border bg-surface px-3 py-4',
        className,
      )}
    >
      <Link
        href={ROUTES.dashboard}
        {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
        className="mb-7 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted"
        aria-label="Invora dashboard"
      >
        <InvoraMark />
      </Link>

      <nav
        aria-label="Application navigation"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="flex flex-col gap-5 pb-4">
          {APP_NAVIGATION.map((section) => (
            <section
              key={section.label}
              aria-labelledby={`nav-section-${section.label}`}
            >
              <p
                id={`nav-section-${section.label}`}
                className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground-muted"
              >
                {section.label}
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const isActive = isAppNavigationItemActive(item, pathname);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
                        )}
                      >
                        <Icon name={item.icon} className="size-[1.1rem]" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>

      <div className="mt-4 rounded-xl border border-border bg-surface-muted px-3 py-3">
        <p className="text-xs font-semibold text-foreground">Plan with context</p>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">
          Connect sales, inventory, and forecast insight in one workflow.
        </p>
      </div>
    </aside>
  );
}
