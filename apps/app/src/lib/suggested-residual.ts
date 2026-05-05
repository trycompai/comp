import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';

/**
 * Per-strategy max step reduction, applied pro-rata by completion.
 * All coefficients live here — the single place to tune the math if a
 * customer pushes back on conservatism.
 */
const STRATEGY_REDUCTION: Record<
  RiskTreatmentType,
  { likelihood: number; impact: number } | 'pin-minimum'
> = {
  [RiskTreatmentType.accept]: { likelihood: 0, impact: 0 },
  [RiskTreatmentType.transfer]: { likelihood: 0, impact: 1 },
  [RiskTreatmentType.mitigate]: { likelihood: 1, impact: 1 },
  [RiskTreatmentType.avoid]: 'pin-minimum',
};

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

function stepDownLikelihood(current: Likelihood, steps: number): Likelihood {
  const idx = LIKELIHOOD_ORDER.indexOf(current);
  return LIKELIHOOD_ORDER[Math.max(0, idx - steps)];
}

function stepDownImpact(current: Impact, steps: number): Impact {
  const idx = IMPACT_ORDER.indexOf(current);
  return IMPACT_ORDER[Math.max(0, idx - steps)];
}

export interface SuggestedResidualInput {
  likelihood: Likelihood;
  impact: Impact;
  strategy: RiskTreatmentType;
  tasks: { status: TaskStatus }[];
}

export interface SuggestedResidualOutput {
  likelihood: Likelihood;
  impact: Impact;
  completion: number;
}

/**
 * Computes a conservative "suggested residual" from inherent risk + treatment
 * strategy + linked-task completion. Uses Math.floor on the applied step
 * reduction, so partial completion earns no step until fully earned.
 *
 * Tune the coefficients in STRATEGY_REDUCTION above to change the math.
 */
export function suggestedResidual({
  likelihood,
  impact,
  strategy,
  tasks,
}: SuggestedResidualInput): SuggestedResidualOutput {
  const total = tasks.length;
  const done = tasks.filter(
    (t) => t.status === TaskStatus.done || t.status === TaskStatus.not_relevant,
  ).length;
  const completion = total === 0 ? 0 : done / total;

  const reduction = STRATEGY_REDUCTION[strategy];

  if (reduction === 'pin-minimum') {
    return {
      likelihood: Likelihood.very_unlikely,
      impact: Impact.insignificant,
      completion,
    };
  }

  const likelihoodSteps = Math.floor(reduction.likelihood * completion);
  const impactSteps = Math.floor(reduction.impact * completion);

  return {
    likelihood: stepDownLikelihood(likelihood, likelihoodSteps),
    impact: stepDownImpact(impact, impactSteps),
    completion,
  };
}

export interface PreviewResidualInput {
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  strategy: RiskTreatmentType;
  /**
   * Coverage gate — when false, the function returns inherent regardless of
   * strategy. Forces the projected target to honor the "no linked work, no
   * claimed reduction" rule for strategies that require operational evidence
   * (Mitigate, Transfer). Accept naturally returns inherent already, so the
   * flag has no effect there. Defaults to `true` so existing pure callers
   * (and the StrategyPicker preview that shows "what would Mitigate look
   * like") continue to see the full ceiling.
   */
  hasLinkedWork?: boolean;
}

export interface PreviewResidualOutput {
  likelihood: Likelihood;
  impact: Impact;
}

/**
 * The residual the chosen strategy *would* produce at full execution.
 * Used as the target marker on the Risk Matrix and the goal score for the
 * hero's interpolated numeral. Doesn't depend on linked-task completion —
 * use `interpolatedResidualScore` for the in-progress numeral.
 *
 * - Accept   → residual = inherent
 * - Avoid    → residual pins to (very_unlikely, insignificant)
 * - Transfer → residual.impact = stepDown(inherent.impact, 1) (assume the
 *              transfer arrangement — insurance, indemnity — is in place)
 * - Mitigate → likelihood −1, impact −1 (the full-completion outcome)
 *
 * Coverage gate: when `hasLinkedWork === false`, all strategies that
 * require operational evidence (everything except Accept) collapse to
 * `inherent`. We don't claim a reduction without at least one linked
 * task — the strategy alone isn't audit evidence.
 */
export function previewResidual({
  inherentLikelihood,
  inherentImpact,
  strategy,
  hasLinkedWork = true,
}: PreviewResidualInput): PreviewResidualOutput {
  if (!hasLinkedWork && strategy !== RiskTreatmentType.accept) {
    return { likelihood: inherentLikelihood, impact: inherentImpact };
  }
  switch (strategy) {
    case RiskTreatmentType.accept:
      return { likelihood: inherentLikelihood, impact: inherentImpact };
    case RiskTreatmentType.avoid:
      return { likelihood: Likelihood.very_unlikely, impact: Impact.insignificant };
    case RiskTreatmentType.transfer:
      return {
        likelihood: inherentLikelihood,
        impact: stepDownImpact(inherentImpact, 1),
      };
    case RiskTreatmentType.mitigate:
    default:
      return {
        likelihood: stepDownLikelihood(inherentLikelihood, 1),
        impact: stepDownImpact(inherentImpact, 1),
      };
  }
}

export interface InterpolatedScoreInput {
  inherentScore: number;
  targetScore: number;
  /** 0..1 — only meaningful for Mitigate; non-Mitigate strategies pass 1. */
  completion: number;
}

/**
 * Linearly interpolate between inherent and target score by completion %.
 * The Mitigate strategy gates on real task completion so the numeral moves
 * in proportion to actual progress. Non-Mitigate strategies pass
 * completion=1 (the strategy itself is the action; there's no in-progress
 * concept).
 */
export function interpolatedResidualScore({
  inherentScore,
  targetScore,
  completion,
}: InterpolatedScoreInput): number {
  const lerp = inherentScore - (inherentScore - targetScore) * completion;
  return Math.round(lerp);
}
