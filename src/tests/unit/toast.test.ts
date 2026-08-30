import { afterEach, describe, expect, it, vi } from 'vitest';

import { createToastStore } from '@/lib/toast';

afterEach(() => {
  vi.useRealTimers();
});

describe('createToastStore', () => {
  it('starts empty', () => {
    expect(createToastStore().getState()).toEqual([]);
  });

  it('queues a toast with defaults applied', () => {
    const store = createToastStore();

    const id = store.push({ title: 'Saved' });

    expect(store.getState()).toEqual([
      { id, title: 'Saved', description: null, variant: 'info' },
    ]);
  });

  it('keeps the caller-supplied description and variant', () => {
    const store = createToastStore();

    store.push({ title: 'Failed', description: 'Try again.', variant: 'error' });

    expect(store.getState()[0]).toMatchObject({
      title: 'Failed',
      description: 'Try again.',
      variant: 'error',
    });
  });

  it('assigns unique ids and preserves insertion order', () => {
    const store = createToastStore();

    const first = store.push({ title: 'First' });
    const second = store.push({ title: 'Second' });

    expect(first).not.toBe(second);
    expect(store.getState().map((toast) => toast.title)).toEqual(['First', 'Second']);
  });

  it('dismisses a single toast by id', () => {
    const store = createToastStore();
    const first = store.push({ title: 'First' });
    store.push({ title: 'Second' });

    store.dismiss(first);

    expect(store.getState().map((toast) => toast.title)).toEqual(['Second']);
  });

  it('ignores dismissal of an unknown id without notifying subscribers', () => {
    const store = createToastStore();
    store.push({ title: 'First' });
    const listener = vi.fn();
    store.subscribe(listener);

    store.dismiss('does-not-exist');

    expect(store.getState()).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('dismisses every toast at once', () => {
    const store = createToastStore();
    store.push({ title: 'First' });
    store.push({ title: 'Second' });

    store.dismissAll();

    expect(store.getState()).toEqual([]);
  });

  it('does not notify when dismissAll runs on an empty store', () => {
    const store = createToastStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dismissAll();

    expect(listener).not.toHaveBeenCalled();
  });

  it('auto-dismisses after the default duration', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    store.push({ title: 'Saved' });

    vi.advanceTimersByTime(4_999);
    expect(store.getState()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(store.getState()).toEqual([]);
  });

  it('honours a custom duration', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    store.push({ title: 'Saved', duration: 1_000 });

    vi.advanceTimersByTime(1_000);

    expect(store.getState()).toEqual([]);
  });

  it('keeps a toast indefinitely when the duration is zero', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    store.push({ title: 'Persistent', duration: 0 });

    vi.advanceTimersByTime(60_000);

    expect(store.getState()).toHaveLength(1);
  });

  it('cancels the auto-dismiss timer when dismissed manually', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const id = store.push({ title: 'Saved' });
    const listener = vi.fn();

    store.dismiss(id);
    store.subscribe(listener);
    vi.advanceTimersByTime(10_000);

    // A surviving timer would fire a second, redundant notification.
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies subscribers on push and dismiss, and stops after unsubscribe', () => {
    const store = createToastStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const id = store.push({ title: 'Saved', duration: 0 });
    store.dismiss(id);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.push({ title: 'Ignored', duration: 0 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('returns a reference-stable snapshot between mutations', () => {
    const store = createToastStore();
    store.push({ title: 'Saved', duration: 0 });

    expect(store.getState()).toBe(store.getState());
  });
});
