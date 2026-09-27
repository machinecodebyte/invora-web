import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/layout/app-shell';
import {
  APP_NAVIGATION,
  getAppRouteContext,
  isAppNavigationItemActive,
} from '@/components/layout/app-navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { APP_TAGLINE, MAIN_CONTENT_ELEMENT_ID, ROUTES } from '@/lib/constants';

const navigationState = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock('@/features/auth/hooks', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'planner@example.com', fullName: 'Planning User' },
  }),
}));

vi.mock('@/features/auth/components/logout-button', () => ({
  LogoutButton: () => <button type="button">Sign out</button>,
}));

describe('AppShell', () => {
  it('renders authenticated landmarks, navigation, and its children', () => {
    render(<AppShell>Page body</AppShell>);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Application navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Page body');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      ROUTES.products,
    );
  });

  it('uses a skip link that targets the main landmark', async () => {
    render(<AppShell>Content</AppShell>);

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveAttribute('href', `#${MAIN_CONTENT_ELEMENT_ID}`);
    expect(screen.getByRole('main')).toHaveAttribute('id', MAIN_CONTENT_ELEMENT_ID);

    await userEvent.tab();
    expect(skipLink).toHaveFocus();
  });

  it('marks nested route navigation as active', () => {
    navigationState.pathname = ROUTES.salesUpload;
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole('link', { name: 'Upload sales' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    navigationState.pathname = ROUTES.dashboard;
  });

  it('opens and closes the accessible mobile drawer', async () => {
    const user = userEvent.setup();
    render(<AppShell>Content</AppShell>);

    await user.click(
      screen.getByRole('button', { name: 'Open application navigation' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Application navigation' }),
    ).toBeVisible();

    await user.click(
      screen.getAllByRole('button', { name: 'Close application navigation' })[0]!,
    );
    expect(
      screen.queryByRole('dialog', { name: 'Application navigation' }),
    ).not.toBeInTheDocument();
  });
});

describe('application navigation metadata', () => {
  it('derives coherent route context from one navigation source', () => {
    expect(getAppRouteContext(ROUTES.forecastResults)).toEqual({
      title: 'Forecast results',
      section: 'Forecasting',
    });

    const uploadSales = APP_NAVIGATION.flatMap((section) => section.items).find(
      (item) => item.href === ROUTES.salesUpload,
    );
    expect(uploadSales).toBeDefined();
    expect(isAppNavigationItemActive(uploadSales!, ROUTES.salesUpload)).toBe(true);
  });
});

describe('PageContainer', () => {
  it('renders the title as the single page h1', () => {
    render(<PageContainer title="Invora">Body</PageContainer>);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Invora' }),
    ).toBeInTheDocument();
  });

  it('renders optional description and actions without changing its document outline', () => {
    render(
      <PageContainer
        title="Invora"
        description={APP_TAGLINE}
        actions={<Button>New</Button>}
      >
        Body
      </PageContainer>,
    );

    expect(screen.getByText(APP_TAGLINE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });
});
