import type { IconName } from '@/components/ui/icon';
import { ROUTES } from '@/lib/constants';

export interface AppNavigationItem {
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
  readonly description: string;
}

export interface AppNavigationSection {
  readonly label: string;
  readonly items: readonly AppNavigationItem[];
}

export interface AppRouteContext {
  readonly title: string;
  readonly section: string;
}

/**
 * Canonical navigation model shared by desktop navigation, the mobile drawer,
 * and top-bar route context. Feature routes stay stable in `ROUTES`.
 */
export const APP_NAVIGATION: readonly AppNavigationSection[] = [
  {
    label: 'Main',
    items: [
      {
        label: 'Dashboard',
        href: ROUTES.dashboard,
        icon: 'dashboard',
        description: 'Inventory, demand, and reorder overview',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Products',
        href: ROUTES.products,
        icon: 'products',
        description: 'Product catalog',
      },
      {
        label: 'Inventory',
        href: ROUTES.inventory,
        icon: 'inventory',
        description: 'Stock levels and movements',
      },
      {
        label: 'Sales history',
        href: ROUTES.sales,
        icon: 'sales',
        description: 'Historical sales demand',
      },
      {
        label: 'Upload sales',
        href: ROUTES.salesUpload,
        icon: 'upload',
        description: 'Upload sales history',
      },
    ],
  },
  {
    label: 'Forecasting',
    items: [
      {
        label: 'Forecast runs',
        href: ROUTES.forecastRuns,
        icon: 'forecast',
        description: 'Plan and track forecasts',
      },
      {
        label: 'Forecast results',
        href: ROUTES.forecastResults,
        icon: 'results',
        description: 'Review forecast output',
      },
      {
        label: 'Recommendations',
        href: ROUTES.recommendations,
        icon: 'recommendations',
        description: 'Replenishment decisions',
      },
    ],
  },
  {
    label: 'Analytics',
    items: [
      {
        label: 'Reports',
        href: ROUTES.reports,
        icon: 'reports',
        description: 'Operational reports and exports',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Settings',
        href: ROUTES.settings,
        icon: 'settings',
        description: 'Planning and inventory defaults',
      },
    ],
  },
] as const;

function getAllNavigationItems(): readonly AppNavigationItem[] {
  return APP_NAVIGATION.flatMap((section) => section.items);
}

/** Nested application routes inherit their closest stable navigation context. */
export function isAppNavigationItemActive(item: AppNavigationItem, pathname: string) {
  if (pathname === item.href) {
    return true;
  }

  return item.href !== ROUTES.dashboard && pathname.startsWith(`${item.href}/`);
}

/** Route-derived title avoids duplicated page-name maps across the app shell. */
export function getAppRouteContext(pathname: string): AppRouteContext {
  const matched = getAllNavigationItems()
    .filter((item) => isAppNavigationItemActive(item, pathname))
    .sort((left, right) => right.href.length - left.href.length)[0];

  if (matched === undefined) {
    return { title: 'Invora', section: 'Workspace' };
  }

  const section = APP_NAVIGATION.find((candidate) =>
    candidate.items.some((item) => item.href === matched.href),
  );

  return { title: matched.label, section: section?.label ?? 'Workspace' };
}
