'use client';

import { getRiskLevelFromScore, getRiskScore, type RiskLevel } from '@/lib/risk-score';
import {
  interpolatedResidualScore,
  previewResidual,
  suggestedResidual,
} from '@/lib/suggested-residual';
import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Card, CardContent } from '@trycompai/design-system';
import { ArrowRight, Information } from '@trycompai/design-system/icons';
import { RiskMatrix5x5 } from './RiskMatrix5x5';
import { RiskScale } from './RiskScale';
import { ScoreExplainer } from './ScoreExplainer';

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
  // Headline numerals are always inherent → target — the forecast you'd land
  // on if every linked task ships. The numerals don't move based on partial
  // task completion (that was confusing: the narrative already says
  // "assuming linked tasks complete on schedule"). Instead, real-time
  // progress shows up as a smaller "Currently X/10" line under the headline
  // when the user is part-way through the plan.
  // Coverage gate: don't claim a target reduction without linked work.
  // Mitigate / Transfer require operational evidence (a control or task
  // documenting the arrangement) before we project any reduction. Accept
  // returns inherent regardless (no work to do), so the gate is a no-op
  // there.
  const hasLinkedWork = tasks.length > 0;
  const target = previewResidual({
    inherentLikelihood,
    inherentImpact,
    strategy,
    hasLinkedWork,
  });
  const targetScore = getRiskScore(target.likelihood, target.impact);
  const isGatedByCoverage =
    !hasLinkedWork && strategy !== RiskTreatmentType.accept;

  // Mitigate is the only strategy with a meaningful in-progress concept.
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

  // Current interpolated score — shown as a smaller subline under the
  // headline when partway through (Mitigate, 0 < completion < 1).
  const currentScore = interpolatedResidualScore({
    inherentScore: inherent.score,
    targetScore: targetScore.score,
    completion,
  });
  const currentLevel = getRiskLevelFromScore(currentScore);
  const showCurrentSubline =
    strategy === RiskTreatmentType.mitigate && completion > 0 && completion < 1;

  const delta = inherent.score - targetScore.score;
  const inherentLevel = getRiskLevelFromScore(inherent.score);
  const residualLevel = getRiskLevelFromScore(targetScore.score);

  const thirdStat = STRATEGY_THIRD_STAT[strategy];
  const thirdStatValue =
    strategy === RiskTreatmentType.mitigate ? `${completionPct}%` : thirdStat.value;

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          {/* LEFT: narrative */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Risk Reduction — Treatment Impact
              </div>
              <BasePopover.Root>
                <BasePopover.Trigger
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="How is this score calculated?"
                >
                  <Information size={11} aria-hidden="true" />
                  <span>How is this calculated?</span>
                </BasePopover.Trigger>
                <BasePopover.Portal>
                  {/* Subtle backdrop blur — focuses attention on the
                      explainer without making it feel modal. */}
                  <BasePopover.Backdrop className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                  <BasePopover.Positioner
                    align="end"
                    side="bottom"
                    sideOffset={6}
                    className="isolate z-50"
                  >
                    <BasePopover.Popup
                      className="bg-popover text-popover-foreground ring-foreground/10 origin-(--transform-origin) data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 flex w-[360px] flex-col gap-2.5 rounded-lg p-3 text-sm shadow-md ring-1 outline-hidden duration-100"
                    >
                      <ScoreExplainer />
                    </BasePopover.Popup>
                  </BasePopover.Positioner>
                </BasePopover.Portal>
              </BasePopover.Root>
            </div>
            <h1
              className="my-3 flex items-center gap-4 font-mono tabular-nums text-7xl font-normal leading-[0.95] tracking-[-0.05em] md:text-8xl"
              aria-label={`From ${inherent.score} to ${targetScore.score} out of 10`}
            >
              <span style={{ color: LEVEL_COLOR[inherentLevel] }}>
                {inherent.score}
                <span className="align-super text-3xl font-light opacity-40">/10</span>
              </span>
              <ArrowRight size={28} className="text-muted-foreground" aria-hidden="true" />
              <span style={{ color: LEVEL_COLOR[residualLevel] }}>
                {targetScore.score}
                <span className="align-super text-3xl font-light opacity-40">/10</span>
              </span>
            </h1>
            {showCurrentSubline && (
              <div className="-mt-1 mb-3 text-xs text-muted-foreground">
                Currently{' '}
                <span
                  className="font-mono font-bold tabular-nums"
                  style={{ color: LEVEL_COLOR[currentLevel] }}
                >
                  {currentScore}/10
                </span>{' '}
                — {completionPct}% of plan complete
              </div>
            )}
            <p className="max-w-[540px] text-sm leading-[1.55] text-foreground">
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
              {isGatedByCoverage
                ? strategy === RiskTreatmentType.transfer
                  ? 'until a task documenting the transfer arrangement is linked.'
                  : 'until tasks supporting the strategy are linked.'
                : isEmpty
                ? 'since no mitigation plan is in place yet.'
                : STRATEGY_NARRATIVE[strategy]}
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
            residualScore={targetScore.score}
            inherentColor={LEVEL_COLOR[inherentLevel]}
            residualColor={LEVEL_COLOR[residualLevel]}
          />
        </div>
      </CardContent>
    </Card>
  );
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
