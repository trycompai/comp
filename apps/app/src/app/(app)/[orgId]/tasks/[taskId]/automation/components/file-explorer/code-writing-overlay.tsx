import { memo, useEffect, useMemo, useRef, useState } from 'react';

// A premium, minimal, code-writing animation designed for the filesystem panel
// Dark-mode first, subtle gradients, elegant motion
export const CodeWritingOverlay = memo(function CodeWritingOverlay(props: {
  filename?: string;
  className?: string;
}) {
  // Smooth animation ticker
  const [tick, setTick] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      if (dt > 60) {
        setTick((t) => (t + 1) % 4096);
        last = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const lines = useMemo(
    () => [
      'module.exports = async (event) => {',
      '  const orgId = event?.orgId',
      "  const u = new URL('https://api.internal/resource');",
      '  const res = await fetch(u);',
      '  const data = await res.json()',
      '  return { ok: true, data }',
      '}',
    ],
    [],
  );

  // Premium typing simulation across the full sequence (stable whitespace)
  const sequence = useMemo(() => lines.join('\n'), [lines]);
  const total = sequence.length;
  const typed = Math.max(0, Math.floor(((tick % 2600) / 2600) * (total + 10)) - 5);
  const typedClamped = Math.min(total, typed);
  const typedText = useMemo(() => sequence.slice(0, typedClamped), [sequence, typedClamped]);

  // Sparkles near the caret for a premium feel (DOM-based position)
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; life: number }[]>([]);
  const nextId = useRef(0);
  useEffect(() => {
    if (tick % 6 === 0 && caretRef.current) {
      const rect = caretRef.current.getBoundingClientRect();
      const host = caretRef.current.offsetParent as HTMLElement | null;
      let x = rect.left;
      let y = rect.top;
      if (host) {
        const hostRect = host.getBoundingClientRect();
        x = rect.left - hostRect.left;
        y = rect.top - hostRect.top;
      }
      setSparks((prev) => {
        const id = nextId.current++;
        return [...prev.filter((s) => s.life > 0.15), { id, x, y, life: 1 }];
      });
    }
    // decay
    setSparks((prev) => prev.map((s) => ({ ...s, life: s.life - 0.06 })));
  }, [tick]);

  return (
    <div className={'relative w-full h-full flex items-center justify-center overflow-hidden'}>
      {/* Aurora gradient wash */}
      <div className="absolute inset-0">
        <div className="absolute -inset-20 animate-[spin_18s_linear_infinite] opacity-30 blur-2xl bg-gradient-conic from-primary/25 via-accent/25 to-primary/25" />
        <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-transparent to-muted/30 dark:from-muted/40 dark:to-muted/20" />
      </div>

      {/* Shimmering grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[repeating-linear-gradient(0deg,transparent,transparent_31px,hsl(var(--muted-foreground)/0.5)_32px),repeating-linear-gradient(90deg,transparent,transparent_31px,hsl(var(--muted-foreground)/0.5)_32px)] bg-[length:32px_32px] dark:opacity-[0.12]" />

      {/* Card */}
      <div className="relative z-10 w-[min(680px,92%)] rounded-xs border border-primary/12 bg-background/85 backdrop-blur-sm shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300/80" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            </span>
            <span className="text-muted-foreground/90">{props.filename || 'creating file…'}</span>
          </div>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setShowDetails((v: boolean) => !v)}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {/* Body (collapsible like v0) */}
        <div className="px-4 py-4">
          {!showDetails && (
            <div className="select-none">
              <div className="h-2.5 w-36 rounded-sm bg-muted/80 animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-2.5 w-[82%] rounded-sm bg-muted/70 animate-pulse" />
                <div className="h-2.5 w-[65%] rounded-sm bg-accent/40 animate-pulse" />
                <div className="h-2.5 w-[74%] rounded-sm bg-primary/35 animate-pulse" />
                <div className="h-2.5 w-[56%] rounded-sm bg-accent/40 animate-pulse" />
                <div className="h-2.5 w-[40%] rounded-sm bg-primary/35 animate-pulse" />
              </div>
            </div>
          )}

          {showDetails && (
            <div className="relative font-mono text-xs leading-5 text-muted-foreground/90">
              <pre className="whitespace-pre-wrap opacity-85">
                {typedText}
                <span
                  ref={caretRef}
                  className="align-baseline inline-block w-2 h-3 bg-primary/80 animate-pulse"
                />
              </pre>
              {sparks.map((s) => (
                <span
                  key={s.id}
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    left: s.x,
                    top: s.y,
                    width: `${4 * s.life}px`,
                    height: `${4 * s.life}px`,
                    background:
                      'radial-gradient(circle, hsl(var(--accent) / 0.9), hsl(var(--accent) / 0.2) 60%, transparent 70%)',
                    opacity: Math.max(0, s.life),
                    filter: 'blur(0.5px)',
                    transform: `translate(${(1 - s.life) * 6}px, ${(1 - s.life) * -4}px)`,
                    transition: 'opacity 120ms linear',
                  }}
                />
              ))}
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full rounded-xs bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-primary/70 transition-all"
              style={{ width: `${((tick % 40) / 40) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
