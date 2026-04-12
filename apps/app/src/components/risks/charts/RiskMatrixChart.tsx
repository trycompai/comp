'use client';

import { Impact, Likelihood } from '@db';
import { Button, Section } from '@trycompai/design-system';
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

const LIKELIHOOD_ORDER: Likelihood[] = [
  Likelihood.very_likely,
  Likelihood.likely,
  Likelihood.possible,
  Likelihood.unlikely,
  Likelihood.very_unlikely,
];

const IMPACT_ORDER: Impact[] = [
  Impact.insignificant,
  Impact.minor,
  Impact.moderate,
  Impact.major,
  Impact.severe,
];

type RiskLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

const RISK_CELL_CLASSES: Record<RiskLevel, { bg: string; bgActive: string; hover: string; dot: string }> = {
  'very-low': { bg: 'bg-primary/70', bgActive: 'bg-primary', hover: 'hover:bg-primary/85', dot: 'bg-primary' },
  'low': { bg: 'bg-primary/50', bgActive: 'bg-primary/80', hover: 'hover:bg-primary/65', dot: 'bg-primary' },
  'medium': { bg: 'bg-orange-500/70', bgActive: 'bg-orange-500', hover: 'hover:bg-orange-500/85', dot: 'bg-orange-500' },
  'high': { bg: 'bg-red-500/70', bgActive: 'bg-red-500', hover: 'hover:bg-red-500/85', dot: 'bg-red-500' },
  'very-high': { bg: 'bg-red-600/80', bgActive: 'bg-red-600', hover: 'hover:bg-red-600/90', dot: 'bg-red-600' },
};

function getRiskLevel(likelihoodScore: number, impactScore: number): RiskLevel {
  const score = likelihoodScore * impactScore;
  if (score > 16) return 'very-high';
  if (score > 9) return 'high';
  if (score > 4) return 'medium';
  if (score > 1) return 'low';
  return 'very-low';
}

interface RiskMatrixChartProps {
  title: string;
  description: string;
  riskId: string;
  activeLikelihood: Likelihood;
  activeImpact: Impact;
  saveAction: (data: {
    id: string;
    probability: Likelihood;
    impact: Impact;
  }) => Promise<unknown>;
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
  const [initialLikelihood, setInitialLikelihood] =
    useState(initialLikelihoodProp);
  const [initialImpact, setInitialImpact] = useState(initialImpactProp);
  const [activeLikelihood, setActiveLikelihood] =
    useState(initialLikelihoodProp);
  const [activeImpact, setActiveImpact] = useState(initialImpactProp);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInitialLikelihood(initialLikelihoodProp);
    setActiveLikelihood(initialLikelihoodProp);
  }, [initialLikelihoodProp]);

  useEffect(() => {
    setInitialImpact(initialImpactProp);
    setActiveImpact(initialImpactProp);
  }, [initialImpactProp]);

  const activeRow = LIKELIHOOD_ORDER.indexOf(activeLikelihood);
  const activeCol = IMPACT_ORDER.indexOf(activeImpact);
  const hasChanges =
    activeLikelihood !== initialLikelihood || activeImpact !== initialImpact;

  const handleCellClick = (row: number, col: number) => {
    if (readOnly) return;
    setActiveLikelihood(LIKELIHOOD_ORDER[row]);
    setActiveImpact(IMPACT_ORDER[col]);
  };

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
    } catch {
      // handled by caller
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
          <Button
            onClick={handleSave}
            disabled={loading}
            loading={loading}
            size="sm"
          >
            Save
          </Button>
        ) : undefined
      }
    >
      <div
        className="grid gap-x-3"
        style={{ gridTemplateColumns: 'auto 1fr', gridTemplateRows: 'auto auto auto' }}
      >
        <div
          className="flex items-center justify-center"
          style={{ writingMode: 'vertical-rl', gridRow: 1, gridColumn: 1 }}
        >
          <span className="rotate-180 text-[11px] font-medium tracking-wide text-muted-foreground uppercase select-none">
            Likelihood
          </span>
        </div>

        <div style={{ gridRow: 1, gridColumn: 2 }}>
          <div
            className="grid gap-[3px] bg-background rounded-lg"
            style={{ gridTemplateColumns: '1.5rem repeat(5, 1fr)' }}
          >
            {LIKELIHOOD_ORDER.map((_, rowIdx) => (
              <div key={rowIdx} className="contents">
                <div className="flex items-center justify-center">
                  <span className="text-[11px] tabular-nums text-muted-foreground select-none">
                    {5 - rowIdx}
                  </span>
                </div>
                {IMPACT_ORDER.map((_, colIdx) => {
                  const level = getRiskLevel(
                    LIKELIHOOD_SCORES[LIKELIHOOD_ORDER[rowIdx]],
                    IMPACT_SCORES[IMPACT_ORDER[colIdx]],
                  );
                  const classes = RISK_CELL_CLASSES[level];
                  const isActive =
                    rowIdx === activeRow && colIdx === activeCol;

                  let rounding = '';
                  if (rowIdx === 0 && colIdx === 0) rounding = 'rounded-tl-lg';
                  if (rowIdx === 0 && colIdx === 4) rounding = 'rounded-tr-lg';
                  if (rowIdx === 4 && colIdx === 0) rounding = 'rounded-bl-lg';
                  if (rowIdx === 4 && colIdx === 4) rounding = 'rounded-br-lg';

                  return (
                    <div
                      key={colIdx}
                      className={`relative h-10 flex items-center justify-center transition-colors duration-150 ${rounding} ${isActive ? classes.bgActive : classes.bg} ${!readOnly && !isActive ? classes.hover : ''} ${readOnly ? '' : 'cursor-pointer'}`}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                    >
                      {isActive && (
                        <div
                          className={`h-3 w-3 rounded-full border-2 border-background shadow-sm ${classes.dot}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div
          className="grid mt-1.5"
          style={{ gridRow: 2, gridColumn: 2, gridTemplateColumns: '1.5rem repeat(5, 1fr)' }}
        >
          <div />
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex justify-center">
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {n}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex justify-center mt-1.5"
          style={{ gridRow: 3, gridColumn: 2 }}
        >
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase select-none">
            Impact
          </span>
        </div>
      </div>
    </Section>
  );
}
