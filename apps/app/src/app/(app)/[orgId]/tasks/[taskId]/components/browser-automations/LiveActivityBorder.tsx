'use client';

/**
 * Glow over a live browser view so it's obvious who's driving:
 * `ai` = the AI is acting (green glow); `you` = it's your turn (amber glow).
 *
 * The ring is an inline box-shadow with an explicit color — not a global CSS
 * class — so it can't be dropped by the CSS pipeline or go stale, and it renders
 * on any page regardless of theme tokens. Only opacity pulses (Tailwind's
 * animate-pulse), which is GPU-cheap and doesn't repaint the busy live iframe.
 * Purely decorative and never blocks clicks (the user can still take over).
 */
export function LiveActivityBorder({ state }: { state: 'ai' | 'you' }) {
  // Bright, high-contrast colors that read clearly on both light and dark pages.
  const color = state === 'ai' ? '#22c55e' : '#f59e0b';
  return (
    <div
      aria-hidden
      data-activity-state={state}
      className="pointer-events-none absolute inset-0 rounded-[inherit] animate-pulse"
      style={{
        boxShadow: `inset 0 0 0 3px ${color}, inset 0 0 22px 3px ${color}66`,
      }}
    />
  );
}
