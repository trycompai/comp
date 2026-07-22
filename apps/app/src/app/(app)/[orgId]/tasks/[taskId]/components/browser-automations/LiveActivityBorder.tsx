'use client';

/**
 * Green glow over the live browser view, shown ONLY while the AI is controlling
 * it — so it's obvious the AI is driving. On the user's turn we render nothing
 * (no ring), so the two states read differently.
 *
 * Inline box-shadow with an explicit color (can't be stripped by the CSS
 * pipeline or go stale, and needs no theme tokens) + Tailwind's animate-pulse
 * (opacity-only, GPU-cheap, so it doesn't repaint the busy live iframe).
 * Decorative and click-through, so take-over still works.
 */
export function LiveActivityBorder() {
  const color = '#22c55e';
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] animate-pulse"
      style={{ boxShadow: `inset 0 0 0 3px ${color}, inset 0 0 22px 3px ${color}66` }}
    />
  );
}
