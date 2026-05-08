'use client';

const SEGMENT_BACKGROUNDS = [
  'color-mix(in oklab, var(--success) 35%, transparent)',
  'color-mix(in oklab, var(--success) 25%, var(--warning) 35%)',
  'color-mix(in oklab, var(--warning) 35%, transparent)',
  'color-mix(in oklab, var(--warning) 25%, var(--destructive) 35%)',
  'color-mix(in oklab, var(--destructive) 35%, transparent)',
];

const LABELS = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];

function pctFor(score: number): number {
  return ((score - 0.5) / 10) * 100;
}

interface RiskScaleProps {
  inherentScore: number;
  residualScore: number;
  /** Color for the inherent marker line + label. Defaults to destructive. */
  inherentColor?: string;
  /** Color for the residual marker line + label. Defaults to primary. */
  residualColor?: string;
}

export function RiskScale({
  inherentScore,
  residualScore,
  inherentColor = 'var(--destructive)',
  residualColor = 'var(--primary)',
}: RiskScaleProps) {
  return (
    <div className="relative pt-3 pb-6">
      <div
        className="grid h-2.5 overflow-hidden rounded-full border border-border"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
      >
        {SEGMENT_BACKGROUNDS.map((bg, i) => (
          <div key={i} style={{ background: bg }} />
        ))}
      </div>

      {/* Inherent marker */}
      <div
        className="absolute"
        style={{
          left: `${pctFor(inherentScore)}%`,
          top: 6,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="mx-auto" style={{ width: 2, height: 18, background: inherentColor }} />
        <div
          className="mt-0.5 text-center font-mono text-[10px] font-bold tabular-nums"
          style={{ color: inherentColor, letterSpacing: '0.05em' }}
        >
          {inherentScore}
        </div>
      </div>

      {/* Residual marker */}
      <div
        className="absolute"
        style={{
          left: `${pctFor(residualScore)}%`,
          top: 6,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="mx-auto" style={{ width: 2, height: 18, background: residualColor }} />
        <div
          className="mt-0.5 text-center font-mono text-[10px] font-bold tabular-nums"
          style={{ color: residualColor, letterSpacing: '0.05em' }}
        >
          {residualScore}
        </div>
      </div>

      <div
        className="mt-3 grid font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
      >
        {LABELS.map((l) => (
          <span key={l} className="text-center">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
