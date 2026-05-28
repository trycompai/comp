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
                  className="pointer-events-none absolute top-0 h-full rounded-lg border border-border bg-card shadow-md"
                  style={{
                    // Slightly narrower than the card above (a few px each side).
                    left: depth * 4,
                    right: depth * 4,
                    transform: `translateY(${depth * 12}px)`,
                    zIndex: MAX_PEEK_LAYERS - depth + 1,
                  }}
                />
              );
            })}
            <div className="relative z-10">{children}</div>
          </div>
        </div>
      )}
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
