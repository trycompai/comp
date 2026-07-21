'use client';

import type { CSSProperties } from 'react';

/**
 * Animated glow over a live browser view so it's obvious who's driving:
 * `ai` = the AI is acting (primary glow); `you` = it's your turn (amber glow).
 * Purely decorative and never blocks clicks (the user can still take over).
 */
export function LiveActivityBorder({ state }: { state: 'ai' | 'you' }) {
  const color = state === 'ai' ? 'var(--primary)' : 'var(--warning)';
  return (
    <div
      aria-hidden
      className="browser-activity-border pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{ '--activity-color': color } as CSSProperties}
    />
  );
}
