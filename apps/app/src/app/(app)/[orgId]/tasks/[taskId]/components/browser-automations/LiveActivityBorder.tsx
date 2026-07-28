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
 * Who's-driving indicator over the live browser: a small status pill only —
 * `ai` → green "AI is controlling", `you` → amber "Your turn". Overlay-only and
 * click-through, so take-over still works; fades in with the page.
 */
export function LiveActivityBorder({ state = 'ai' }: { state?: 'ai' | 'you' }) {
  const pill =
    state === 'you'
      ? { label: 'Your turn', bg: '#b45309', dot: '#fcd34d' }
      : { label: 'AI is controlling', bg: '#15803d', dot: '#86efac' };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] animate-in fade-in-0 duration-700"
    >
      <StatusPill {...pill} />
    </div>
  );
}
