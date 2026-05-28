'use client';

import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import type { ReactNode } from 'react';

/**
 * Wrapper that groups one or more notification nudges into a single tray with
 * an integrated expand/collapse footer, so the "show more" control reads as
 * part of the unit rather than floating loose on the page.
 */
export function NudgeCenter({
  count,
  expanded,
  onToggle,
  children,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-1.5">
      <div className="flex flex-col gap-1.5">{children}</div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-center gap-1 self-start rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? (
          <>
            Show less
            <ChevronUp size={14} />
          </>
        ) : (
          <>
            Show {count} notifications
            <ChevronDown size={14} />
          </>
        )}
      </button>
    </div>
  );
}
