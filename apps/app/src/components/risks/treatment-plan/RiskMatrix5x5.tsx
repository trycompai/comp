'use client';

import { Impact, Likelihood } from '@db';
import { Text } from '@trycompai/design-system';

const LIKELIHOOD_ORDER: Likelihood[] = [
  Likelihood.very_unlikely,
  Likelihood.unlikely,
  Likelihood.possible,
  Likelihood.likely,
  Likelihood.very_likely,
];

const IMPACT_ORDER: Impact[] = [
  Impact.insignificant,
  Impact.minor,
  Impact.moderate,
  Impact.major,
  Impact.severe,
];

const CELL_SIZE = 36;

function cellBackground(likelihoodIdx: number, impactIdx: number): string {
  const heat = (likelihoodIdx + impactIdx) / 8; // 0..1
  if (heat > 0.7) {
    return `color-mix(in oklab, var(--destructive) ${(heat * 40).toFixed(0)}%, transparent)`;
  }
  if (heat > 0.4) {
    return `color-mix(in oklab, var(--warning) ${(heat * 40).toFixed(0)}%, transparent)`;
  }
  return `color-mix(in oklab, var(--success) ${((1 - heat) * 30).toFixed(0)}%, transparent)`;
}

interface RiskMatrix5x5Props {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
}

export function RiskMatrix5x5({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
}: RiskMatrix5x5Props) {
  const inherentL = LIKELIHOOD_ORDER.indexOf(inherentLikelihood);
  const inherentI = IMPACT_ORDER.indexOf(inherentImpact);
  const residualL = LIKELIHOOD_ORDER.indexOf(residualLikelihood);
  const residualI = IMPACT_ORDER.indexOf(residualImpact);

  const cells: React.ReactNode[] = [];
  // Render rows top-to-bottom: highest likelihood first (row 4 → 0)
  for (let row = 4; row >= 0; row--) {
    for (let col = 0; col < 5; col++) {
      const isInherent = row === inherentL && col === inherentI;
      const isResidual = row === residualL && col === residualI;
      cells.push(
        <div
          key={`${row}-${col}`}
          className="rounded-sm border border-border/50 grid place-items-center relative"
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: cellBackground(row, col),
          }}
        >
          {isInherent && (
            <span
              aria-label="Current risk"
              className="rounded-full"
              style={{
                width: CELL_SIZE * 0.55,
                height: CELL_SIZE * 0.55,
                background: 'var(--destructive)',
                outline: '2px solid var(--background)',
                position: 'absolute',
              }}
            />
          )}
          {isResidual && (
            <span
              aria-label="Residual risk"
              className="rounded-full"
              style={{
                width: CELL_SIZE * 0.55,
                height: CELL_SIZE * 0.55,
                background: 'var(--primary)',
                border: '2px solid var(--background)',
                position: 'absolute',
              }}
            />
          )}
        </div>
      );
    }
  }

  return (
    <div className="bg-muted rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          5×5 Risk Matrix
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="rounded-full"
              style={{ width: 9, height: 9, background: 'var(--destructive)' }}
            />
            <Text as="span" size="xs" variant="muted">
              Now
            </Text>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="rounded-full"
              style={{ width: 9, height: 9, background: 'var(--primary)' }}
            />
            <Text as="span" size="xs" variant="muted">
              Target
            </Text>
          </span>
        </div>
      </div>
      <div className="grid items-stretch gap-1.5" style={{ gridTemplateColumns: '12px 1fr' }}>
        <div
          className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground flex items-center justify-center"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Likelihood →
        </div>
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `repeat(5, ${CELL_SIZE}px)`,
            gap: 2,
          }}
        >
          {cells}
        </div>
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground text-center mt-2">
        ← Impact →
      </div>
    </div>
  );
}
