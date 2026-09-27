import type { SVGProps } from 'react';

import { cn } from '@/lib/utils';

export type IconName =
  | 'arrow-right'
  | 'chart'
  | 'check'
  | 'close'
  | 'dashboard'
  | 'forecast'
  | 'inventory'
  | 'menu'
  | 'products'
  | 'recommendations'
  | 'reports'
  | 'results'
  | 'sales'
  | 'settings'
  | 'shield'
  | 'sparkles'
  | 'upload';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
  title?: string;
}

/**
 * Small, dependency-free icon set used by navigation and product presentation.
 * Icons inherit the surrounding text color so they work across existing themes.
 */
export function Icon({ name, title, className, ...props }: IconProps) {
  const labelled = title !== undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      className={cn('size-5 shrink-0', className)}
      {...props}
    >
      {title === undefined ? null : <title>{title}</title>}
      <IconPaths name={name} />
    </svg>
  );
}

function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case 'arrow-right':
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
    case 'chart':
      return (
        <>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 4-4 3 2 5-6" />
        </>
      );
    case 'check':
      return <path d="m5 12 4.2 4.2L19 6.5" />;
    case 'close':
      return <path d="m6 6 12 12M18 6 6 18" />;
    case 'dashboard':
      return (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </>
      );
    case 'forecast':
      return (
        <>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 5-7" />
          <path d="M18 6h-3" />
        </>
      );
    case 'inventory':
      return (
        <>
          <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
          <path d="m4 12 8 4.5 8-4.5" />
          <path d="m4 16.5 8 4.5 8-4.5" />
        </>
      );
    case 'menu':
      return <path d="M4 7h16M4 12h16M4 17h16" />;
    case 'products':
      return (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4.5 7.5 7.5 4.3 7.5-4.3" />
          <path d="M12 12v9" />
        </>
      );
    case 'recommendations':
      return (
        <>
          <path d="M12 3a7 7 0 0 0-4.6 12.3c.8.7 1.2 1.5 1.2 2.4h6.8c0-.9.4-1.7 1.2-2.4A7 7 0 0 0 12 3Z" />
          <path d="M9 21h6M10 18h4" />
        </>
      );
    case 'reports':
      return (
        <>
          <path d="M6 3h9l3 3v15H6V3Z" />
          <path d="M15 3v4h4M9 12h6M9 16h6" />
        </>
      );
    case 'results':
      return (
        <>
          <path d="M5 20V10M10 20V4M15 20v-7M20 20V7" />
          <path d="M3 20h18" />
        </>
      );
    case 'sales':
      return (
        <>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h4" />
        </>
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L6.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4.8v-3.2H5a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3.2v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );
    case 'shield':
      return (
        <>
          <path d="M12 3 19 6v5c0 4.5-3 7.7-7 10-4-2.3-7-5.5-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
    case 'sparkles':
      return (
        <>
          <path d="m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3Z" />
          <path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15ZM5 15l.6 2.4L8 18l-2.4.6L5 21l-.6-2.4L2 18l2.4-.6L5 15Z" />
        </>
      );
    case 'upload':
      return (
        <>
          <path d="M12 15V3M8 7l4-4 4 4" />
          <path d="M5 13v6h14v-6" />
        </>
      );
  }
}
