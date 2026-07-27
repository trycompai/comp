'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadColumnWidths, saveColumnWidths } from './column-widths-cookie';

// Columns can't be dragged narrower than this.
const MIN_COLUMN_WIDTH = 60;

/**
 * FRAME-17: drag-to-resize column widths for a plain `<table>`, persisted to a
 * cookie. Apply `widths` via a `<colgroup>` with `table-layout: fixed`, and put
 * a {@link ColumnResizeHandle} on each header cell.
 */
export function useResizableColumns(cookieName: string, defaults: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(defaults);

  // Cookies are client-only; hydrate after mount to avoid an SSR mismatch.
  useEffect(() => {
    const saved = loadColumnWidths(cookieName);
    if (Object.keys(saved).length > 0) {
      setWidths((prev) => ({ ...prev, ...saved }));
    }
  }, [cookieName]);

  // Latest widths for the drag handlers without re-binding them every render.
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  // Teardown for an in-progress drag, so it can also run if we unmount mid-drag.
  const activeCleanupRef = useRef<(() => void) | null>(null);

  const startResize = useCallback(
    (key: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = widthsRef.current[key] ?? 150;

      const handleMove = (moveEvent: MouseEvent) => {
        const next = Math.max(
          MIN_COLUMN_WIDTH,
          Math.round(startWidth + (moveEvent.clientX - startX)),
        );
        setWidths((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
      };

      // Detach listeners + restore selection. Safe to call from mouseup or unmount.
      const detach = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.body.style.userSelect = '';
        activeCleanupRef.current = null;
      };

      const handleUp = () => {
        detach();
        saveColumnWidths(cookieName, widthsRef.current);
      };

      // Suppress text selection while dragging.
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      activeCleanupRef.current = detach;
    },
    [cookieName],
  );

  // Fallback: unmounting mid-drag tears down the global listeners and restores
  // text selection so nothing leaks.
  useEffect(() => () => activeCleanupRef.current?.(), []);

  return { widths, startResize };
}

/** A draggable divider rendered at the right edge of a (relative) header cell. */
export function ColumnResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (event: React.MouseEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onResizeStart}
      // Don't let a drag on the divider trigger the header's sort click.
      onClick={(event) => event.stopPropagation()}
      className="hover:bg-primary/50 absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize select-none"
    />
  );
}
