'use client';

import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import type { ReactNode } from 'react';

const MAX_PEEK_LAYERS = 2;

/**
 * Groups multiple notification nudges. Collapsed, it renders the top nudge on a
 * "pile" — a sliver of the cards behind it peeks out — with a toggle to fan the
 * whole stack open. Expanded, every nudge is shown in a vertical list.
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
  const peekLayers = Math.min(count - 1, MAX_PEEK_LAYERS);

  return (
    <div className="flex flex-col gap-1.5">
      {expanded ? (
        <div className="flex flex-col gap-2">{children}</div>
      ) : (
        // Padding reserves room for the peeking edges that sit below the top card.
        <div style={{ paddingBottom: peekLayers * 12 + 2 }}>
          {/* `isolate` keeps the stack's own stacking context so the peek layers
              sit just behind the top card (not behind an ancestor background). */}
          <div className="relative isolate">
            {Array.from({ length: peekLayers }).map((_, i) => {
              const depth = i + 1;
              return (
                <div
                  key={depth}
                  aria-hidden
                  className="pointer-events-none absolute top-0 h-full rounded-lg border border-blue-200 bg-blue-50 shadow-md dark:border-blue-800 dark:bg-blue-950/50"
                  style={{
                    // Each card behind is a little narrower than the one above it.
                    left: depth * 8,
                    right: depth * 8,
                    transform: `translateY(${depth * 12}px)`,
                    zIndex: MAX_PEEK_LAYERS - depth + 1,
                  }}
                />
              );
            })}
            <div className="relative z-10 rounded-lg shadow-lg">{children}</div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 self-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        {expanded ? (
          <>
            <ChevronUp size={14} />
            Show less
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            {count} notifications
          </>
        )}
      </button>
    </div>
  );
}
