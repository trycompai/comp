'use client';

/** Small floating status pill at the bottom of the live view. */
function StatusPill({ label, bg, dot }: { label: string; bg: string; dot: string }) {
  return (
    <div
      className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        background: bg,
        color: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        letterSpacing: '0.04em',
      }}
    >
      <span className="ai-ring-pip h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      <span className="text-[10.5px] font-semibold">{label}</span>
    </div>
  );
}

/**
 * Who's-driving indicator over the live browser:
 * - `ai`  → soft green glow that breathes + "AI is controlling".
 * - `you` → an amber "Your turn" pill, no glow (the ring is reserved for the AI,
 *           so the two states read differently at a glance).
 *
 * Only opacity animates (GPU-cheap), so the streamed live iframe never repaints.
 * Overlay-only and click-through, so take-over still works. Adapted for our
 * overflow-hidden container (glow is inset; the pill sits inside at the bottom).
 */
export function LiveActivityBorder({ state = 'ai' }: { state?: 'ai' | 'you' }) {
  if (state === 'you') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
        <StatusPill label="Your turn" bg="#b45309" dot="#fcd34d" />
      </div>
    );
  }

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
      {/* Soft breathing glow only — no border line, just the green bleeding in. */}
      <div
        className="ai-ring-halo absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: 'inset 0 0 32px 7px rgba(34,197,94,0.42)' }}
      />
      <StatusPill label="AI is controlling" bg="#15803d" dot="#86efac" />
    </div>
  );
}
