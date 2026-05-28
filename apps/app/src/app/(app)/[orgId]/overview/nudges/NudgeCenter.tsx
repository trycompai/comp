'use client';

import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import type { ReactNode } from 'react';

const MAX_PEEK_LAYERS = 2;

/**
 * Groups multiple notification nudges. Collapsed, it renders the top nudge on a
 * "pile" — a sliver of the cards behind it peeks out — with a toggle chip
 * overlaid on the bottom edge to fan the whole stack open. Expanded, every
 * nudge is shown in a vertical list.
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

  const toggle = (positionClass: string) => (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-lg transition-colors hover:bg-accent ${positionClass}`}
    >
      {expanded ? (
        <>
          <ChevronUp size={14} />
          Show less
        </>
      ) : (
        <>
          <ChevronDown size={14} />
          {count} notices
        </>
      )}
    </button>
  );

  if (expanded) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex w-full flex-col gap-2">{children}</div>
        {toggle('')}
      </div>
    );
  }

  // Collapsed: top nudge on a pile, with the toggle chip overlaid on the
  // bottom-center edge. Padding reserves room for the peeks + the chip overhang.
  return (
    <div style={{ paddingBottom: Math.max(peekLayers * 12, 16) + 12 }}>
      {/* `isolate` keeps the stack's own stacking context so the peek layers
          sit just behind the top card (not behind an ancestor background). */}
      <div className="relative isolate">
        {Array.from({ length: peekLayers }).map((_, i) => {
          const depth = i + 1;
          return (
            <div
              key={depth}
              aria-hidden
              className="pointer-events-none absolute top-0 h-full rounded-lg border border-warning/30 bg-warning/15 shadow-md"
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
        {toggle(
          'absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-[65%]',
        )}
      </div>
    </div>
  );
}
