import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

describe('Card', () => {
  it('renders a composed card with all regions', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Application status</CardTitle>
          <CardDescription>Current runtime state.</CardDescription>
        </CardHeader>
        <CardContent>Ready</CardContent>
        <CardFooter>Updated just now</CardFooter>
      </Card>,
    );

    expect(screen.getByText('Application status')).toBeInTheDocument();
    expect(screen.getByText('Current runtime state.')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Updated just now')).toBeInTheDocument();
  });

  it('renders the title as a level 3 heading by default', () => {
    render(<CardTitle>Summary</CardTitle>);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Summary' }),
    ).toBeInTheDocument();
  });

  it('allows the heading level to be set so the document outline stays correct', () => {
    render(<CardTitle as="h2">Summary</CardTitle>);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Summary' }),
    ).toBeInTheDocument();
  });

  it('forwards additional attributes to the container', () => {
    render(<Card data-testid="metrics-card">Body</Card>);

    expect(screen.getByTestId('metrics-card')).toBeInTheDocument();
  });
});

describe('Spinner', () => {
  it('exposes a status role with a default accessible label', () => {
    render(<Spinner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('supports a custom label', () => {
    render(<Spinner label="Loading forecast run" />);

    expect(screen.getByText('Loading forecast run')).toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg'] as const)('renders the %s size', (size) => {
    render(<Spinner size={size} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('is hidden from assistive technology because it conveys no content', () => {
    render(<Skeleton className="h-4 w-32" />);

    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies caller-supplied sizing classes', () => {
    render(<Skeleton className="h-4 w-32" />);

    expect(screen.getByTestId('skeleton').className).toContain('w-32');
  });
});
