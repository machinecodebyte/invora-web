import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LandingPage } from '@/components/marketing/landing-page';
import { ROUTES } from '@/lib/constants';

describe('LandingPage', () => {
  it('renders the brand, product value, workflow, capability, FAQ, and footer sections', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Predict demand. Protect inventory. Replenish with confidence.',
      }),
    ).toBeVisible();
    expect(screen.getAllByText('INVORA')[0]).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'From product records to replenishment planning.',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'A practical toolkit for inventory intelligence.',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'The details behind the planning workflow.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('All rights reserved.');
  });

  it('keeps primary account CTAs mapped to the existing public Auth routes', () => {
    render(<LandingPage />);

    const registerLinks = screen.getAllByRole('link', { name: 'Get started' });
    const loginLinks = screen.getAllByRole('link', { name: 'Log in' });

    expect(registerLinks[0]).toHaveAttribute('href', ROUTES.register);
    expect(loginLinks[0]).toHaveAttribute('href', ROUTES.login);
  });

  it('opens the accessible mobile navigation and closes it after anchor navigation', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const mobileNavigation = document.getElementById('landing-mobile-menu');
    expect(mobileNavigation).not.toHaveClass('hidden');
    await user.click(
      within(mobileNavigation!).getByRole('link', { name: 'Capabilities' }),
    );
    expect(mobileNavigation).toHaveClass('hidden');
  });

  it('uses only valid internal anchors or stable application routes', () => {
    render(<LandingPage />);

    const applicationRoutes: readonly string[] = [
      ROUTES.home,
      ROUTES.login,
      ROUTES.register,
      ROUTES.dashboard,
      ROUTES.products,
      ROUTES.inventory,
      ROUTES.forecastRuns,
      ROUTES.reports,
    ];

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href');
      expect(href).not.toBeNull();
      expect(href).not.toBe('#');
      expect(href!.startsWith('#') || applicationRoutes.includes(href!)).toBe(true);
    }
  });
});
