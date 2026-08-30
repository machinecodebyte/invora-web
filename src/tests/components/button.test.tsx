import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders as an accessible button with its label', () => {
    render(<Button>Save changes</Button>);

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('defaults to type="button" so it cannot submit a surrounding form', () => {
    render(<Button>Cancel</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('accepts an explicit submit type', () => {
    render(<Button type="submit">Submit</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('calls the click handler when activated with a pointer', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is operable with the keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('blocks interaction when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('announces the busy state and blocks interaction while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps its label visible while loading and exposes a status region', () => {
    render(<Button isLoading>Save changes</Button>);

    expect(screen.getByText('Save changes')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('supports a custom loading label for assistive technology', () => {
    render(
      <Button isLoading loadingLabel="Uploading file">
        Upload
      </Button>,
    );

    expect(screen.getByText('Uploading file')).toBeInTheDocument();
  });

  it('omits aria-busy when idle', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Action</Button>);

      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    },
  );

  it('lets a caller-supplied class override a conflicting default', () => {
    render(<Button className="h-20">Tall</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('h-20');
    expect(button.className).not.toContain('h-10');
  });

  it('forwards arbitrary button attributes', () => {
    render(<Button aria-label="Close dialog" data-testid="close" />);

    expect(screen.getByTestId('close')).toHaveAccessibleName('Close dialog');
  });
});
