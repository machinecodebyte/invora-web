import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

describe('EmptyState', () => {
  it('uses generic default copy so it carries no business wording', () => {
    render(<EmptyState />);

    expect(screen.getByText('No data available.')).toBeInTheDocument();
  });

  it('accepts a custom title and description', () => {
    render(<EmptyState title="No records yet." description="Add one to begin." />);

    expect(screen.getByText('No records yet.')).toBeInTheDocument();
    expect(screen.getByText('Add one to begin.')).toBeInTheDocument();
  });

  it('renders an action when provided', async () => {
    const onClick = vi.fn();
    render(<EmptyState action={<Button onClick={onClick}>Add record</Button>} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add record' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides a decorative icon from assistive technology', () => {
    render(<EmptyState icon={<span data-testid="icon">□</span>} />);

    expect(screen.getByTestId('icon').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('is not announced as an alert, because nothing failed', () => {
    render(<EmptyState />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('uses generic default copy', () => {
    render(<ErrorState />);

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('announces the failure to assistive technology', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a caller-supplied description', () => {
    render(<ErrorState description="The service is temporarily unavailable." />);

    expect(
      screen.getByText('The service is temporarily unavailable.'),
    ).toBeInTheDocument();
  });

  it('offers no retry control unless a handler is supplied', () => {
    render(<ErrorState />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('invokes the retry handler when the control is activated', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('supports a custom retry label', () => {
    render(<ErrorState onRetry={vi.fn()} retryLabel="Reload data" />);

    expect(screen.getByRole('button', { name: 'Reload data' })).toBeInTheDocument();
  });

  it('is keyboard operable', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
