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
 * ENG-221 — see docs/superpowers/specs/2026-04-24-eng-221-risk-treatment-plan-design.md
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
