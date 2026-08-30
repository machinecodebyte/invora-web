import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

describe('Input', () => {
  it('is reachable by its associated label', () => {
    render(
      <>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" />
      </>,
    );

    expect(screen.getByLabelText('SKU')).toBeInTheDocument();
  });

  it('accepts typed text', async () => {
    render(<Input aria-label="Search" />);

    await userEvent.type(screen.getByRole('textbox'), 'widget');

    expect(screen.getByRole('textbox')).toHaveValue('widget');
  });

  it('exposes aria-invalid when marked invalid', () => {
    render(<Input aria-label="Email" invalid />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('omits aria-invalid when valid, so assistive tech is not misled', () => {
    render(<Input aria-label="Email" />);

    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('links an error message through aria-describedby', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" invalid aria-describedby="email-error" />
        <p id="email-error">Enter a valid email address.</p>
      </>,
    );

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
  });

  it('rejects input when disabled', async () => {
    render(<Input aria-label="Search" disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();

    await userEvent.type(input, 'ignored');
    expect(input).toHaveValue('');
  });

  it('accepts a ref as a plain prop, so register() can be spread onto it', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input aria-label="Search" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards the input type', () => {
    render(<Input aria-label="Password" type="password" />);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});

describe('Label', () => {
  it('associates itself with its control', () => {
    render(
      <>
        <Label htmlFor="quantity">Quantity</Label>
        <input id="quantity" />
      </>,
    );

    expect(screen.getByText('Quantity')).toHaveAttribute('for', 'quantity');
  });

  it('keeps the required marker out of the accessible name', () => {
    render(
      <>
        <Label htmlFor="quantity" required>
          Quantity
        </Label>
        <input id="quantity" required />
      </>,
    );

    // Queried by accessible name, which is computed with the real accname
    // algorithm and therefore excludes the aria-hidden asterisk. The control's
    // own `required` attribute carries the semantics.
    const input = screen.getByRole('textbox', { name: 'Quantity' });
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });
});
