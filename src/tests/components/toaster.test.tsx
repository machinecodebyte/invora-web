import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { toastStore } from '@/lib/toast';

/** Harness that raises notifications through the public hook API. */
function ToastHarness() {
  const { toast, dismissAll } = useToast();

  return (
    <>
      <Button onClick={() => toast({ title: 'Changes saved', duration: 0 })}>
        Notify
      </Button>
      <Button
        onClick={() =>
          toast({
            title: 'Request failed',
            description: 'Please try again.',
            variant: 'error',
            duration: 0,
          })
        }
      >
        Notify error
      </Button>
      <Button onClick={dismissAll}>Clear</Button>
      <Toaster />
    </>
  );
}

afterEach(() => {
  // The store is module-level; leftover toasts would leak into the next test.
  toastStore.dismissAll();
});

describe('Toaster with useToast', () => {
  it('renders nothing until a toast is raised', () => {
    render(<ToastHarness />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('displays a toast raised through the hook', async () => {
    render(<ToastHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
  });

  it('announces an error toast assertively via role="alert"', async () => {
    render(<ToastHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Notify error' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Request failed');
    expect(alert).toHaveTextContent('Please try again.');
  });

  it('announces a non-error toast politely via role="status"', async () => {
    render(<ToastHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Changes saved');
  });

  it('dismisses a toast through its labelled close control', async () => {
    render(<ToastHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));

    await userEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification: Changes saved' }),
    );

    await waitFor(() => {
      expect(screen.queryByText('Changes saved')).not.toBeInTheDocument();
    });
  });

  it('clears every toast at once', async () => {
    render(<ToastHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    await userEvent.click(screen.getByRole('button', { name: 'Notify error' }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(screen.queryByText('Changes saved')).not.toBeInTheDocument();
      expect(screen.queryByText('Request failed')).not.toBeInTheDocument();
    });
  });

  it('stacks multiple toasts', async () => {
    render(<ToastHarness />);

    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    await userEvent.click(screen.getByRole('button', { name: 'Notify error' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(screen.getByText('Request failed')).toBeInTheDocument();
  });
});
