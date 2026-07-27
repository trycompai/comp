import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useResizableColumns } from './resizable-columns';

afterEach(() => {
  document.body.style.userSelect = '';
});

const mouseDown = (clientX = 0) =>
  ({
    preventDefault() {},
    stopPropagation() {},
    clientX,
  }) as unknown as ReactMouseEvent;

describe('useResizableColumns drag teardown', () => {
  it('restores text selection if the component unmounts mid-drag', () => {
    const { result, unmount } = renderHook(() =>
      useResizableColumns('fwk-test-resize-unmount', { name: 200 }),
    );
    act(() => result.current.startResize('name', mouseDown(10)));
    expect(document.body.style.userSelect).toBe('none');

    unmount();
    expect(document.body.style.userSelect).toBe('');
  });

  it('restores text selection when the drag ends normally (mouseup)', () => {
    const { result } = renderHook(() =>
      useResizableColumns('fwk-test-resize-mouseup', { name: 200 }),
    );
    act(() => result.current.startResize('name', mouseDown(10)));
    expect(document.body.style.userSelect).toBe('none');

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(document.body.style.userSelect).toBe('');
  });
});
