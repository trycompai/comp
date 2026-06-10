'use client';

import { useEffect } from 'react';

// Module-level registry of grids that currently hold uncommitted changes.
// Navigation chrome (e.g. FrameworkTabs) consults it before letting the user
// leave, since leaving a page discards all uncommitted grid rows.
const dirtyKeys = new Set<string>();

export const UNSAVED_CHANGES_MESSAGE =
  'You have uncommitted changes that will be lost if you leave. Click "Commit Changes" first, or leave anyway?';

export function hasUnsavedChanges(): boolean {
  return dirtyKeys.size > 0;
}

export function confirmDiscardUnsavedChanges(): boolean {
  if (!hasUnsavedChanges()) return true;
  return window.confirm(UNSAVED_CHANGES_MESSAGE);
}

/**
 * Registers a grid's dirty state while mounted and warns on hard
 * reload/close via beforeunload. In-app navigation is guarded by callers of
 * confirmDiscardUnsavedChanges() (e.g. FrameworkTabs).
 */
export function useUnsavedChangesGuard(key: string, isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    dirtyKeys.add(key);
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome still requires returnValue to be set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      dirtyKeys.delete(key);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [key, isDirty]);
}
