'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Impact, Likelihood } from '@db';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
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

const getRiskColor = (level: string) => {
  switch (level) {
    case 'very-low':
      return 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30';
    case 'low':
      return 'bg-green-500/20 border-green-500/30 hover:bg-green-500/30';
    case 'medium':
      return 'bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/30 hover:bg-orange-500/30';
    case 'very-high':
      return 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30';
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
}

export function RiskMatrixChart({
  title,
  description,
  riskId,
  activeLikelihood: initialLikelihoodProp,
  activeImpact: initialImpactProp,
  saveAction,
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <Button onClick={handleSave} variant="default" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div>
            <div className="grid grid-cols-6 rounded-lg">
              <div className="h-12" />
              {impactLevels.map((impact, index) => (
                <div key={impact} className="flex flex-col items-center justify-center">
                  <span className="text-center text-xs leading-tight">{impact}</span>
                </div>
              ))}
              {probabilityLevels.map((probability, rowIdx) => (
                <div key={probability} className="contents">
                  <div
                    className="mr-4 flex flex-col items-center justify-center"
                    title={probabilityLabels[rowIdx]}
                  >
                    <span className="text-xs">{probabilityNumbers[rowIdx]}</span>
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
                        className={`relative h-12 cursor-pointer border transition-all duration-200 ${getRiskColor(cell?.level || 'very-low')} flex items-center justify-center ${rounding} `}
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
            <div className="mt-2 flex justify-center">
              <span className="text-xs">{'Impact'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
