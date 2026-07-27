import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  confirmDiscardUnsavedChanges,
  hasUnsavedChanges,
  useUnsavedChangesGuard,
} from './unsaved-changes';

describe('unsaved-changes guard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks dirty state while mounted and releases on cleanup', () => {
    const { rerender, unmount } = renderHook(
      ({ dirty }: { dirty: boolean }) => useUnsavedChangesGuard('grid-a', dirty),
      { initialProps: { dirty: false } },
    );
    expect(hasUnsavedChanges()).toBe(false);

    rerender({ dirty: true });
    expect(hasUnsavedChanges()).toBe(true);

    rerender({ dirty: false });
    expect(hasUnsavedChanges()).toBe(false);

    rerender({ dirty: true });
    unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('confirmDiscardUnsavedChanges passes through when clean and prompts when dirty', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(confirmDiscardUnsavedChanges()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();

    const { unmount } = renderHook(() => useUnsavedChangesGuard('grid-b', true));
    expect(confirmDiscardUnsavedChanges()).toBe(false);
    expect(confirmSpy).toHaveBeenCalledOnce();

    confirmSpy.mockReturnValue(true);
    expect(confirmDiscardUnsavedChanges()).toBe(true);
    unmount();
  });
});
