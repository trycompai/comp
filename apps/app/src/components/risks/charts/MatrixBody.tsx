'use client';

import { IMPACT_SCORES, LIKELIHOOD_SCORES, getRiskLevel } from '@/lib/risk-score';
import { Impact, Likelihood } from '@db';
import { AxisTooltip } from './AxisTooltip';

export const VISUAL_LIKELIHOOD_ORDER: Likelihood[] = [
  Likelihood.very_likely,
  Likelihood.likely,
  Likelihood.possible,
  Likelihood.unlikely,
  Likelihood.very_unlikely,
];
export const VISUAL_IMPACT_ORDER: Impact[] = [
  Impact.insignificant,
  Impact.minor,
  Impact.moderate,
  Impact.major,
  Impact.severe,
];

export const probabilityLevels = [
  'Very Likely',
  'Likely',
  'Possible',
  'Unlikely',
  'Very Unlikely',
];
export const probabilityNumbers = ['5', '4', '3', '2', '1'];
export const impactLevels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Severe'];

const LIKELIHOOD_DEFINITIONS: Record<string, string> = {
  'Very Likely': 'Expected to occur multiple times per year without mitigations.',
  Likely: 'Expected to occur at least once per year without mitigations.',
  Possible: 'Could occur in the next 1–3 years.',
  Unlikely: 'Could occur but not expected in the next 3 years.',
  'Very Unlikely': 'Rare event; theoretical possibility only.',
};

const IMPACT_DEFINITIONS: Record<string, string> = {
  Insignificant: 'No material impact on operations, customers, or compliance.',
  Minor: 'Contained, short-term operational issue; limited customer or compliance exposure.',
  Moderate: 'Operational disruption, customer complaint, or contained compliance finding.',
  Major: 'Significant customer impact, regulator scrutiny, or material revenue loss.',
  Severe: 'Existential or multi-year impact: breach, enforcement action, or loss of trust.',
};

interface RiskCell {
  probability: string;
  impact: string;
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  value?: number;
}

const getRiskColor = (level: string, readOnly?: boolean) => {
  switch (level) {
    case 'very-low':
      return `bg-emerald-500/20 border-emerald-500/30${readOnly ? '' : ' hover:bg-emerald-500/30'}`;
    case 'low':
      return `bg-green-500/20 border-green-500/30${readOnly ? '' : ' hover:bg-green-500/30'}`;
    case 'medium':
      return `bg-yellow-500/20 border-yellow-500/30${readOnly ? '' : ' hover:bg-yellow-500/30'}`;
    case 'high':
      return `bg-orange-500/20 border-orange-500/30${readOnly ? '' : ' hover:bg-orange-500/30'}`;
    case 'very-high':
      return `bg-red-500/20 border-red-500/30${readOnly ? '' : ' hover:bg-red-500/30'}`;
    default:
      return 'bg-slate-500/20 border-slate-500/30';
  }
};

export function buildRiskData(
  activeLikelihood: Likelihood,
  activeImpact: Impact,
): RiskCell[] {
  const activeProbability = probabilityLevels[VISUAL_LIKELIHOOD_ORDER.indexOf(activeLikelihood)];
  const activeImpactLevel = impactLevels[VISUAL_IMPACT_ORDER.indexOf(activeImpact)];

  return probabilityLevels.flatMap((probability) =>
    impactLevels.map((impact) => {
      const likelihoodScore =
        LIKELIHOOD_SCORES[VISUAL_LIKELIHOOD_ORDER[probabilityLevels.indexOf(probability)]];
      const impactScore = IMPACT_SCORES[VISUAL_IMPACT_ORDER[impactLevels.indexOf(impact)]];
      const level = getRiskLevel(likelihoodScore * impactScore);

      return {
        probability,
        impact,
        level,
        value: probability === activeProbability && impact === activeImpactLevel ? 1 : undefined,
      };
    }),
  );
}

interface MatrixBodyProps {
  readOnly?: boolean;
  riskData: RiskCell[];
  handleCellClick: (probability: string, impact: string) => void;
  suggestedLikelihood?: Likelihood;
  suggestedImpact?: Impact;
}

export function MatrixBody({
  readOnly,
  riskData,
  handleCellClick,
  suggestedLikelihood,
  suggestedImpact,
}: MatrixBodyProps) {
  return (
    <div className="flex gap-0">
      <div className="flex-1">
        <div className="mb-2 flex justify-center">
          <span className="text-xs font-medium text-muted-foreground">Impact</span>
        </div>
        <div className="grid rounded-lg" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
          {probabilityLevels.map((probability, rowIdx) => (
            <div key={probability} className="contents">
              <div className="flex items-center justify-start">
                <span className="text-xs text-muted-foreground">
                  <AxisTooltip
                    label={probabilityNumbers[rowIdx]}
                    definition={`${probabilityLevels[rowIdx]}: ${LIKELIHOOD_DEFINITIONS[probabilityLevels[rowIdx]] ?? ''}`}
                  />
                </span>
              </div>
              {impactLevels.map((impact, colIdx) => {
                const cell = riskData.find(
                  (item) => item.probability === probability && item.impact === impact,
                );
                let rounding = '';
                if (rowIdx === 0 && colIdx === 0) rounding = 'rounded-tl-lg';
                if (rowIdx === 0 && colIdx === impactLevels.length - 1)
                  rounding = 'rounded-tr-lg';
                if (rowIdx === probabilityLevels.length - 1 && colIdx === 0)
                  rounding = 'rounded-bl-lg';
                if (
                  rowIdx === probabilityLevels.length - 1 &&
                  colIdx === impactLevels.length - 1
                )
                  rounding = 'rounded-br-lg';
                const isSuggested =
                  suggestedLikelihood !== undefined &&
                  suggestedImpact !== undefined &&
                  VISUAL_LIKELIHOOD_ORDER[rowIdx] === suggestedLikelihood &&
                  VISUAL_IMPACT_ORDER[colIdx] === suggestedImpact;
                return (
                  <div
                    key={`${probability}-${impact}`}
                    className={`relative h-12 ${readOnly ? '' : 'cursor-pointer'} border transition-all duration-200 ${getRiskColor(cell?.level || 'very-low', readOnly)} flex items-center justify-center ${rounding} `}
                    onClick={() => handleCellClick(probability, impact)}
                  >
                    {cell?.value && (
                      <div className="h-4 w-4 animate-pulse rounded-full bg-white shadow-lg ring-2 ring-slate-900/70 dark:ring-slate-100/80" />
                    )}
                    {isSuggested && !cell?.value && (
                      <div
                        className="h-8 w-8 animate-pulse rounded-md border-2 border-dashed border-sky-500/80"
                        title="Suggested by treatment plan"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="grid mt-2" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
          <div />
          {impactLevels.map((impact) => (
            <div key={impact} className="flex justify-center">
              <span className="text-center text-xs text-muted-foreground leading-tight">
                <AxisTooltip label={impact} definition={IMPACT_DEFINITIONS[impact] ?? ''} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="flex items-center justify-center ml-2"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-xs font-medium text-muted-foreground">Likelihood</span>
      </div>
    </div>
  );
}
