'use client';

import { getRiskLevel, getRiskScore, type RiskLevel } from '@/lib/risk-score';
import {
  interpolatedResidualScore,
  previewResidual,
  suggestedResidual,
} from '@/lib/suggested-residual';
import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { Card, CardContent } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { RiskMatrix5x5 } from './RiskMatrix5x5';
import { RiskScale } from './RiskScale';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'LOW',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  'very-high': 'CRITICAL',
};

const LEVEL_COLOR: Record<RiskLevel, string> = {
  'very-low': 'oklch(0.45 0.14 145)',
  low: 'oklch(0.45 0.14 145)',
  medium: 'oklch(0.5 0.14 85)',
  high: 'oklch(0.5 0.18 50)',
  'very-high': 'var(--destructive)',
};

const LIKELIHOOD_DISPLAY: Record<Likelihood, string> = {
  very_unlikely: 'Very Unlikely',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  very_likely: 'Very Likely',
};

const IMPACT_DISPLAY: Record<Impact, string> = {
  insignificant: 'Insignificant',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  severe: 'Severe',
};

interface TreatmentHeroProps {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  /**
   * @deprecated The hero now derives residual from `strategy` + `tasks` via
   * `previewResidual`, so the math reflects the user's current strategy
   * selection live. These props are retained for callers that haven't
   * migrated yet but are unused.
   */
  residualLikelihood?: Likelihood;
  residualImpact?: Impact;
  strategy: RiskTreatmentType;
  tasks: { status: TaskStatus }[];
  /**
   * When true, the narrative reflects "no plan in place yet" instead of the
   * standard strategy-specific copy. Used for the Mitigate-fully-empty case
   * where columns 02 and 03 are merged into a single empty-state CTA.
   */
  isEmpty?: boolean;
}

const STRATEGY_NARRATIVE: Record<RiskTreatmentType, string> = {
  mitigate: 'assuming linked tasks complete on schedule.',
  accept: 'because we are accepting this risk as-is.',
  transfer: 'because the impact is transferred via insurance or contract.',
  avoid: 'because we are eliminating the activity that causes this risk.',
};

const STRATEGY_THIRD_STAT: Record<
  RiskTreatmentType,
  { label: string; value: string }
> = {
  mitigate: { label: 'Task Completion', value: '' }, // value computed live
  accept: { label: 'Strategy', value: 'Accepted as-is' },
  transfer: { label: 'Strategy', value: 'Impact transferred' },
  avoid: { label: 'Strategy', value: 'Activity eliminated' },
};

export function TreatmentHero({
  inherentLikelihood,
  inherentImpact,
  strategy,
  tasks,
  isEmpty,
}: TreatmentHeroProps) {
  const inherent = getRiskScore(inherentLikelihood, inherentImpact);
  // Target = the residual the strategy would produce at full execution.
  // Used as the matrix cell marker.
  const target = previewResidual({
    inherentLikelihood,
    inherentImpact,
    strategy,
  });
  const targetScore = getRiskScore(target.likelihood, target.impact);

  // For Mitigate, the displayed score interpolates between inherent and
  // target by linked-task completion so partial progress shows in the
  // numeral even when the matrix cell would otherwise stay at inherent.
  // Non-Mitigate strategies are "always at full completion" — the strategy
  // itself is the action.
  const completion =
    strategy === RiskTreatmentType.mitigate
      ? suggestedResidual({
          likelihood: inherentLikelihood,
          impact: inherentImpact,
          strategy,
          tasks,
        }).completion
      : 1;
  const completionPct = Math.round(completion * 100);

  const displayedResidualScore = interpolatedResidualScore({
    inherentScore: inherent.score,
    targetScore: targetScore.score,
    completion,
  });
  const delta = inherent.score - displayedResidualScore;
  const inherentLevel = getRiskLevel(inherent.raw);
  // Color the residual numeral by where the displayed score falls on the
  // level scale (very-low/low/medium/high/very-high). We approximate raw
  // from the displayed score so the level lookup is consistent.
  const displayedRaw =
    displayedResidualScore === inherent.score ? inherent.raw : approximateRawFromScore(displayedResidualScore);
  const residualLevel = getRiskLevel(displayedRaw);

  const thirdStat = STRATEGY_THIRD_STAT[strategy];
  const thirdStatValue =
    strategy === RiskTreatmentType.mitigate ? `${completionPct}%` : thirdStat.value;

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          {/* LEFT: narrative */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Risk Reduction — Treatment Impact
            </div>
            <h1
              className="my-3 flex items-center gap-4 font-mono tabular-nums text-7xl font-normal leading-[0.95] tracking-[-0.05em] md:text-8xl"
              aria-label={`From ${inherent.score} to ${displayedResidualScore} out of 10`}
            >
              <span style={{ color: LEVEL_COLOR[inherentLevel] }}>
                {inherent.score}
                <span className="align-super text-3xl font-light opacity-40">/10</span>
              </span>
              <ArrowRight size={28} className="text-muted-foreground" aria-hidden="true" />
              <span style={{ color: LEVEL_COLOR[residualLevel] }}>
                {displayedResidualScore}
                <span className="align-super text-3xl font-light opacity-40">/10</span>
              </span>
            </h1>
            <p className="max-w-[540px] text-base leading-[1.55] text-foreground">
              The plan moves this risk from{' '}
              <strong
                className="font-bold"
                style={{ color: LEVEL_COLOR[inherentLevel] }}
              >
                {LEVEL_LABEL[inherentLevel]}
              </strong>{' '}
              to{' '}
              <strong
                className="font-bold"
                style={{ color: LEVEL_COLOR[residualLevel] }}
              >
                {LEVEL_LABEL[residualLevel]}
              </strong>{' '}
              —{' '}
              {delta === 0 ? (
                <span className="font-mono font-bold text-primary tabular-nums">no change</span>
              ) : (
                <>
                  a{' '}
                  <span className="font-mono font-bold text-primary tabular-nums">
                    {delta > 0 ? '−' : '+'}
                    {Math.abs(delta)}
                  </span>{' '}
                  point swing
                </>
              )}{' '}
              {isEmpty ? 'since no mitigation plan is in place yet.' : STRATEGY_NARRATIVE[strategy]}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
              <HeroStatPair
                label="Likelihood"
                from={LIKELIHOOD_DISPLAY[inherentLikelihood]}
                to={LIKELIHOOD_DISPLAY[target.likelihood]}
              />
              <HeroStatPair
                label="Impact"
                from={IMPACT_DISPLAY[inherentImpact]}
                to={IMPACT_DISPLAY[target.impact]}
              />
              <HeroStatSingle label={thirdStat.label} value={thirdStatValue} />
            </div>
          </div>

          {/* RIGHT: matrix — the marker shows the strategy's full-completion
              target, regardless of in-progress completion. */}
          <RiskMatrix5x5
            inherentLikelihood={inherentLikelihood}
            inherentImpact={inherentImpact}
            residualLikelihood={target.likelihood}
            residualImpact={target.impact}
          />
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <RiskScale
            inherentScore={inherent.score}
            residualScore={displayedResidualScore}
            inherentColor={LEVEL_COLOR[inherentLevel]}
            residualColor={LEVEL_COLOR[residualLevel]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Approximate raw L×I from a 1-10 score. Inverse of getRiskScore's
 * `Math.ceil(raw / 2.5)` — used to color the lerped residual numeral.
 * Multiple raw values map to one score; pick the lower bound of each band:
 * score=1→raw=1, score=2→raw=3, score=3→raw=6, ..., generally raw ≈ (score-1)*2.5+1.
 */
function approximateRawFromScore(score: number): number {
  if (score <= 1) return 1;
  return (score - 1) * 2.5 + 0.5;
}

function HeroStatPair({ label, from, to }: { label: string; from: string; to: string }) {
  const sameValue = from === to;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-sm">
        <span
          className={
            sameValue
              ? 'text-foreground'
              : 'text-muted-foreground line-through decoration-muted-foreground'
          }
        >
          {from}
        </span>
        {!sameValue && (
          <>
            <ArrowRight size={12} className="text-muted-foreground" aria-hidden="true" />
            <span className="text-foreground">{to}</span>
          </>
        )}
      </div>
    </div>
  );
}

function HeroStatSingle({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 font-mono text-[22px] font-normal tabular-nums tracking-[-0.02em] text-primary">
        {value}
      </div>
    </div>
  );
}
