import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

describe('Dialog', () => {
  it('provides labelled modal semantics and closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open title="Edit product" onClose={onClose}>
        <Button>Save</Button>
      </Dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Edit product' })).toHaveAttribute(
      'aria-modal',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the invoking control after close', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <Button>Open product dialog</Button>
        <Dialog open={false} title="Add product" onClose={onClose}>
          <Button>Save</Button>
        </Dialog>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Open product dialog' });
    trigger.focus();

    rerender(
      <>
        <Button>Open product dialog</Button>
        <Dialog open title="Add product" onClose={onClose}>
          <Button>Save</Button>
        </Dialog>
      </>,
    );
    rerender(
      <>
        <Button>Open product dialog</Button>
        <Dialog open={false} title="Add product" onClose={onClose}>
          <Button>Save</Button>
        </Dialog>
      </>,
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open product dialog' })).toHaveFocus();
  });
});
