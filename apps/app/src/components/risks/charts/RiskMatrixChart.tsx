'use client';

import { Impact, Likelihood } from '@db';
import { Button, HStack, Section } from '@trycompai/design-system';
import { useEffect, useState } from 'react';

const LIKELIHOOD_SCORES: Record<Likelihood, number> = {
  very_unlikely: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  very_likely: 5,
};

const IMPACT_SCORES: Record<Impact, number> = {
  insignificant: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  severe: 5,
};

const VISUAL_LIKELIHOOD_ORDER: Likelihood[] = [
  Likelihood.very_likely,
  Likelihood.likely,
  Likelihood.possible,
  Likelihood.unlikely,
  Likelihood.very_unlikely,
];
const VISUAL_IMPACT_ORDER: Impact[] = [
  Impact.insignificant,
  Impact.minor,
  Impact.moderate,
  Impact.major,
  Impact.severe,
];

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

const probabilityLevels = ['Very Likely', 'Likely', 'Possible', 'Unlikely', 'Very Unlikely'];
const probabilityNumbers = ['5', '4', '3', '2', '1'];
const probabilityLabels = [
  'Very Likely (5)',
  'Likely (4)',
  'Possible (3)',
  'Unlikely (2)',
  'Very Unlikely (1)',
];
const impactLevels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Severe'];
const impactNumbers = ['1', '2', '3', '4', '5'];

interface RiskMatrixChartProps {
  title: string;
  description: string;
  riskId: string;
  activeLikelihood: Likelihood;
  activeImpact: Impact;
  saveAction: (data: { id: string; probability: Likelihood; impact: Impact }) => Promise<any>;
  readOnly?: boolean;
}

export function RiskMatrixChart({
  title,
  description,
  riskId,
  activeLikelihood: initialLikelihoodProp,
  activeImpact: initialImpactProp,
  saveAction,
  readOnly,
}: RiskMatrixChartProps) {
  const [initialLikelihood, setInitialLikelihood] = useState<Likelihood>(initialLikelihoodProp);
  const [initialImpact, setInitialImpact] = useState<Impact>(initialImpactProp);
  const [activeLikelihood, setActiveLikelihood] = useState<Likelihood>(initialLikelihoodProp);
  const [activeImpact, setActiveImpact] = useState<Impact>(initialImpactProp);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInitialLikelihood(initialLikelihoodProp);
    setActiveLikelihood(initialLikelihoodProp);
  }, [initialLikelihoodProp]);
  useEffect(() => {
    setInitialImpact(initialImpactProp);
    setActiveImpact(initialImpactProp);
  }, [initialImpactProp]);

  const activeProbability = probabilityLevels[VISUAL_LIKELIHOOD_ORDER.indexOf(activeLikelihood)];
  const activeImpactLevel = impactLevels[VISUAL_IMPACT_ORDER.indexOf(activeImpact)];

  // Create risk data
  const riskData: RiskCell[] = probabilityLevels.flatMap((probability) =>
    impactLevels.map((impact) => {
      const likelihoodScore =
        LIKELIHOOD_SCORES[VISUAL_LIKELIHOOD_ORDER[probabilityLevels.indexOf(probability)]];
      const impactScore = IMPACT_SCORES[VISUAL_IMPACT_ORDER[impactLevels.indexOf(impact)]];
      const score = likelihoodScore * impactScore;

      let level: RiskCell['level'] = 'very-low';
      if (score > 16) level = 'very-high';
      else if (score > 9) level = 'high';
      else if (score > 4) level = 'medium';
      else if (score > 1) level = 'low';

      return {
        probability,
        impact,
        level,
        value: probability === activeProbability && impact === activeImpactLevel ? 1 : undefined,
      };
    }),
  );

  const handleCellClick = (probability: string, impact: string) => {
    if (readOnly) return;
    const likelihoodIdx = probabilityLevels.indexOf(probability);
    const impactIdx = impactLevels.indexOf(impact);
    const newLikelihood = VISUAL_LIKELIHOOD_ORDER[likelihoodIdx];
    const newImpact = VISUAL_IMPACT_ORDER[impactIdx];
    setActiveLikelihood(newLikelihood);
    setActiveImpact(newImpact);
  };

  const hasChanges = activeLikelihood !== initialLikelihood || activeImpact !== initialImpact;

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveAction({
        id: riskId,
        probability: activeLikelihood,
        impact: activeImpact,
      });
      setInitialLikelihood(activeLikelihood);
      setInitialImpact(activeImpact);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section
      title={title}
      description={description}
      actions={
        !readOnly && hasChanges ? (
          <Button onClick={handleSave} disabled={loading} loading={loading} size="sm">
            Save
          </Button>
        ) : undefined
      }
    >
        <div className="flex gap-0">
          <div className="flex-1">
            <div className="mb-2 flex justify-center">
              <span className="text-xs font-medium text-muted-foreground">Impact</span>
            </div>
            <div className="grid rounded-lg" style={{ gridTemplateColumns: '2rem repeat(5, 1fr)' }}>
              {probabilityLevels.map((probability, rowIdx) => (
                <div key={probability} className="contents">
                  <div
                    className="flex items-center justify-start"
                    title={probabilityLabels[rowIdx]}
                  >
                    <span className="text-xs text-muted-foreground">{probabilityNumbers[rowIdx]}</span>
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
                    return (
                      <div
                        key={`${probability}-${impact}`}
                        className={`relative h-12 ${readOnly ? '' : 'cursor-pointer'} border transition-all duration-200 ${getRiskColor(cell?.level || 'very-low', readOnly)} flex items-center justify-center ${rounding} `}
                        onClick={() => handleCellClick(probability, impact)}
                      >
                        {cell?.value && (
                          <div className="h-3 w-3 animate-pulse rounded-full bg-white shadow-lg" />
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
                  <span className="text-center text-xs text-muted-foreground leading-tight">{impact}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center ml-2" style={{ writingMode: 'vertical-rl' }}>
            <span className="text-xs font-medium text-muted-foreground">Likelihood</span>
          </div>
        </div>
    </Section>
  );
}
