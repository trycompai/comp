'use client';

/**
 * "AI is controlling" indicator over the live browser — a SOFT green glow that
 * breathes at the edges (not a hard line) plus a small status pill. Only opacity
 * animates (GPU-cheap), so the streamed live iframe never repaints. Rendered
 * only while the AI is driving; overlay-only and click-through, so take-over
 * still works.
 *
 * Adapted for our overflow-hidden container: the glow is inset (an outer halo
 * would be clipped), and the pill sits inside at the bottom (the design's top-
 * outside position would be clipped / clash with the browser chrome bar).
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
      {/* Status pill. */}
      <div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          background: '#15803d',
          color: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          letterSpacing: '0.04em',
        }}
      >
        <span
          className="ai-ring-pip h-1.5 w-1.5 rounded-full"
          style={{ background: '#86efac' }}
        />
        <span className="text-[10.5px] font-semibold">AI is controlling</span>
      </div>
    </div>
  );
}
