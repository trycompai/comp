'use client';

/**
 * "AI is controlling" ring over the live browser — design: ai-control-ring.html
 * ("breathing glow"). A static 2px green ring plus a soft inner glow that
 * breathes. Only opacity animates (GPU-cheap), so the streamed live iframe never
 * repaints. Rendered only while the AI is driving; overlay-only and
 * click-through, so take-over still works.
 *
 * Adapted for our overflow-hidden live-view container: the design's outer halo
 * (and top pill) would be clipped, so we glow inward instead. The static ring is
 * inline so it's visible even if the keyframe CSS hasn't compiled; the breathing
 * comes from the `ai-ring-halo` keyframe in globals.css.
 */
export function LiveActivityBorder() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] rounded-[inherit]"
    >
      {/* Soft inner glow, breathing via opacity (painted once, no repaint). */}
      <div
        className="ai-ring-halo absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            'inset 0 0 12px 1px rgba(34,197,94,0.55), inset 0 0 28px 5px rgba(34,197,94,0.22)',
        }}
      />
      {/* Constant 2px ring — inline so it's always visible. */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{ border: '2px solid #22c55e' }}
      />
    </div>
  );
}
