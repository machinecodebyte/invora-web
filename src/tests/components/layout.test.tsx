import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { describe, expect, it } from 'vitest';

import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { APP_NAME, APP_TAGLINE, MAIN_CONTENT_ELEMENT_ID } from '@/lib/constants';

describe('AppShell', () => {
  it('renders the banner, main, and footer landmarks', () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders its children inside the main landmark', () => {
    render(<AppShell>Page body</AppShell>);

    expect(screen.getByRole('main')).toHaveTextContent('Page body');
  });

  it('shows the Invora brand and tagline', () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole('banner')).toHaveTextContent(APP_NAME);
    expect(screen.getByRole('banner')).toHaveTextContent(APP_TAGLINE);
  });

  it('provides a skip link that targets the main landmark', () => {
    render(<AppShell>Content</AppShell>);

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveAttribute('href', `#${MAIN_CONTENT_ELEMENT_ID}`);
    expect(screen.getByRole('main')).toHaveAttribute('id', MAIN_CONTENT_ELEMENT_ID);
  });

  it('makes the skip link the first focusable element', async () => {
    render(<AppShell>Content</AppShell>);

    await userEvent.tab();

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
  });

  it('omits the navigation landmark when no navigation is supplied', () => {
    render(<AppShell>Content</AppShell>);

    // The foundation ships no navigation; an empty nav landmark would be noise
    // for screen reader users.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders supplied navigation inside a labelled navigation landmark', () => {
    render(<AppShell navigation={<Link href="/">Home</Link>}>Content</AppShell>);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent('Home');
  });
});

describe('PageContainer', () => {
  it('renders its children', () => {
    render(<PageContainer>Body</PageContainer>);

    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders the title as the single page h1', () => {
    render(<PageContainer title="Invora">Body</PageContainer>);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Invora' }),
    ).toBeInTheDocument();
  });

  it('renders a description alongside the title', () => {
    render(
      <PageContainer title="Invora" description={APP_TAGLINE}>
        Body
      </PageContainer>,
    );

    expect(screen.getByText(APP_TAGLINE)).toBeInTheDocument();
  });

  it('renders page-level actions', () => {
    render(
      <PageContainer title="Invora" actions={<Button>New</Button>}>
        Body
      </PageContainer>,
    );

    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });

  it('emits no heading block when given only children', () => {
    render(<PageContainer>Body</PageContainer>);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
