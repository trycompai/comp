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

const CELL_SIZE = 44;

// Cell colors mirror the 5 score-band segments used by RiskScale at the
// bottom of the hero, so the matrix, the headline numeral color, and the
// bottom scale all agree on what counts as Low / Medium / High / etc.
//
// Score for cell (L_idx, I_idx) = ceil((L_idx+1)(I_idx+1) / 2.5), then bucket
// by the same thresholds as `getRiskLevelFromScore`:
//   1-2 → very-low,  3-4 → low,  5-6 → medium,  7-8 → high,  9-10 → very-high
const CELL_BACKGROUND_BY_SCORE_BAND: Record<
  'very-low' | 'low' | 'medium' | 'high' | 'very-high',
  string
> = {
  'very-low': 'color-mix(in oklab, var(--success) 35%, transparent)',
  low: 'color-mix(in oklab, var(--success) 25%, var(--warning) 35%)',
  medium: 'color-mix(in oklab, var(--warning) 35%, transparent)',
  high: 'color-mix(in oklab, var(--warning) 25%, var(--destructive) 35%)',
  'very-high': 'color-mix(in oklab, var(--destructive) 35%, transparent)',
};

function cellBackground(likelihoodIdx: number, impactIdx: number): string {
  const raw = (likelihoodIdx + 1) * (impactIdx + 1);
  const score = Math.max(1, Math.ceil(raw / 2.5));
  if (score >= 9) return CELL_BACKGROUND_BY_SCORE_BAND['very-high'];
  if (score >= 7) return CELL_BACKGROUND_BY_SCORE_BAND.high;
  if (score >= 5) return CELL_BACKGROUND_BY_SCORE_BAND.medium;
  if (score >= 3) return CELL_BACKGROUND_BY_SCORE_BAND.low;
  return CELL_BACKGROUND_BY_SCORE_BAND['very-low'];
}

interface RiskMatrix5x5Props {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  /**
   * 0..1 — completion of the linked treatment work. The "Now" marker is
   * rendered at a position interpolated between the inherent cell and the
   * residual (target) cell by this fraction. Default 0 means the Now
   * marker sits on the inherent cell (no progress yet).
   */
  completion?: number;
  /** When true, render a small "Preliminary — assessment still running" subtitle below the matrix. */
  preliminary?: boolean;
}

const GAP = 2;

export function RiskMatrix5x5({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
  completion,
  preliminary,
}: RiskMatrix5x5Props) {
  const inherentL = LIKELIHOOD_ORDER.indexOf(inherentLikelihood);
  const inherentI = IMPACT_ORDER.indexOf(inherentImpact);
  const residualL = LIKELIHOOD_ORDER.indexOf(residualLikelihood);
  const residualI = IMPACT_ORDER.indexOf(residualImpact);
  const c = Math.min(1, Math.max(0, completion ?? 0));
  // Fractional "Now" position — interpolated between inherent and target by
  // task completion. Snaps to inherent when completion=0 and to target when
  // completion=1; lands somewhere in-between for partial progress.
  const nowLFloat = inherentL + (residualL - inherentL) * c;
  const nowIFloat = inherentI + (residualI - inherentI) * c;
  // Pixel offset within the grid (top-left = (0,0)). Rows render top-to-
  // bottom in descending likelihood order, so the y-axis is flipped (4 - L).
  const stepPx = CELL_SIZE + GAP;
  const nowOffsetX = nowIFloat * stepPx + CELL_SIZE / 2;
  const nowOffsetY = (4 - nowLFloat) * stepPx + CELL_SIZE / 2;

  const cells: React.ReactNode[] = [];
  // Render rows top-to-bottom: highest likelihood first (row 4 → 0)
  for (let row = 4; row >= 0; row--) {
    for (let col = 0; col < 5; col++) {
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
          {isResidual && (
            <span
              aria-label="Target risk"
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
      <div className="flex justify-center">
        <div
          className="grid items-stretch gap-1.5"
          style={{ gridTemplateColumns: 'auto auto' }}
        >
          <div
            className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground flex items-center justify-center"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Likelihood →
          </div>
          <div
            className="inline-grid relative"
            style={{
              gridTemplateColumns: `repeat(5, ${CELL_SIZE}px)`,
              gap: GAP,
            }}
          >
            {cells}
            {/* "Now" marker — rendered as an absolute overlay so it can sit
                between cells when partial completion lands its position
                off-grid. */}
            <span
              aria-label="Current risk"
              className="rounded-full pointer-events-none"
              style={{
                position: 'absolute',
                width: CELL_SIZE * 0.55,
                height: CELL_SIZE * 0.55,
                background: 'var(--destructive)',
                outline: '2px solid var(--background)',
                left: nowOffsetX,
                top: nowOffsetY,
                transform: 'translate(-50%, -50%)',
                transition: 'left 200ms ease-out, top 200ms ease-out',
              }}
            />
          </div>
        </div>
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground text-center mt-2">
        ← Impact →
      </div>
      {preliminary && (
        <div className="mt-2">
          <Text size="xs" variant="muted">
            Preliminary — assessment still running
          </Text>
        </div>
      )}
    </div>
  );
}
