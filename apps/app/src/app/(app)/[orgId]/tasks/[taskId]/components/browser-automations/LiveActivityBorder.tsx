'use client';

/**
 * "AI is controlling" indicator over the live browser — a SOFT green glow that
 * breathes at the edges, not a hard line. Only opacity animates (GPU-cheap), so
 * the streamed live iframe never repaints. Rendered only while the AI is driving;
 * overlay-only and click-through, so take-over still works.
 *
 * Feathered inset glows (no solid border) keep it gentle; a faint always-on base
 * keeps the edge softly visible even at the breath's low point. Adapted for our
 * overflow-hidden container: the glow is inset (an outer halo would be clipped).
 */
export function LiveActivityBorder() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] rounded-[inherit]"
    >
      {/* Faint always-on haze so the edge never fully disappears mid-breath. */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: 'inset 0 0 16px 1px rgba(34,197,94,0.16)' }}
      />
      {/* Soft breathing glow + a feathered (semi-transparent, thin) edge. */}
      <div
        className="ai-ring-halo absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            'inset 0 0 0 1.5px rgba(34,197,94,0.40), inset 0 0 28px 6px rgba(34,197,94,0.38)',
        }}
      />
    </div>
  );
}
