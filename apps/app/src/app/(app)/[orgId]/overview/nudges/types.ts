import type { ReactNode } from 'react';

/** Server-resolved data the Overview page passes into the nudge host. */
export interface ServerNudgeData {
  trust: {
    isTrustNdaEnabled: boolean;
    isConfigured: boolean;
  };
}

/**
 * One candidate nudge. The host picks the lowest-`priority` candidate that is
 * `ready && eligible && !dismissed` and renders it — at most one at a time.
 */
export interface NudgeState {
  id: string;
  /** Lower number wins (shown first). */
  priority: number;
  /** true → dismissal persists in localStorage; false → session-only. */
  persistDismissal: boolean;
  /** false while underlying data is still loading. */
  ready: boolean;
  /** Has something to show AND the user is allowed to act on it. */
  eligible: boolean;
  /** Renders the nudge UI; called once for the single visible nudge. */
  render: (onDismiss: () => void) => ReactNode;
}
