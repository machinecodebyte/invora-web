import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '@/components/ui/pagination';
import { TableScrollArea } from '@/components/ui/table-scroll-area';

describe('TableScrollArea', () => {
  it('contains a feature-owned semantic table within a responsive horizontal boundary', () => {
    render(
      <TableScrollArea data-testid="orders-table-boundary">
        <table aria-label="Orders">
          <thead>
            <tr>
              <th scope="col">Order</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>INV-001</td>
            </tr>
          </tbody>
        </table>
      </TableScrollArea>,
    );

    expect(screen.getByRole('table', { name: 'Orders' })).toBeVisible();
    expect(screen.getByTestId('orders-table-boundary')).toHaveClass(
      'max-w-full',
      'overflow-x-auto',
    );
  });
});

describe('Pagination', () => {
  it('announces page position and delegates navigation intent to the owning feature', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <Pagination
        ariaLabel="Order pagination"
        currentPage={2}
        pageCount={3}
        canGoPrevious
        canGoNext
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Order pagination' })).toBeVisible();
    expect(screen.getByText('Page 2 of 3')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('preserves contextual accessible labels and disables boundary actions', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <Pagination
        ariaLabel="Sales history pagination"
        currentPage={1}
        pageCount={2}
        canGoPrevious={false}
        canGoNext
        previousAriaLabel="Previous sales history page"
        nextAriaLabel="Next sales history page"
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    const previous = screen.getByRole('button', {
      name: 'Previous sales history page',
    });
    expect(previous).toBeDisabled();

    await user.click(previous);
    await user.click(screen.getByRole('button', { name: 'Next sales history page' }));

    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
