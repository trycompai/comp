'use client';

import { Impact, Likelihood } from '@db';
import { Button, HStack, Section, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { AxisTooltip } from './AxisTooltip';
import {
  MatrixBody,
  VISUAL_IMPACT_ORDER,
  VISUAL_LIKELIHOOD_ORDER,
  buildRiskData,
  impactLevels,
  probabilityLevels,
} from './MatrixBody';
import { MatrixLegend } from './MatrixLegend';

interface RiskMatrixChartProps {
  title: string;
  description: string;
  riskId: string;
  activeLikelihood: Likelihood;
  activeImpact: Impact;
  saveAction: (data: { id: string; probability: Likelihood; impact: Impact }) => Promise<unknown>;
  readOnly?: boolean;
  /** If set, renders a pulsing dashed-outline cell as the "suggested" residual. */
  suggestedLikelihood?: Likelihood;
  /** If set, renders a pulsing dashed-outline cell as the "suggested" residual. */
  suggestedImpact?: Impact;
  /** Tooltip body shown on the title info icon. */
  titleInfo?: string;
  /** When true, render a small "Preliminary — assessment still running" subtitle below the matrix. */
  preliminary?: boolean;
}

export function RiskMatrixChart({
  title,
  description,
  riskId,
  activeLikelihood: initialLikelihoodProp,
  activeImpact: initialImpactProp,
  saveAction,
  readOnly,
  suggestedLikelihood,
  suggestedImpact,
  titleInfo,
  preliminary,
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

  const riskData = buildRiskData(activeLikelihood, activeImpact);

  const handleCellClick = (probability: string, impact: string) => {
    if (readOnly) return;
    const likelihoodIdx = probabilityLevels.indexOf(probability);
    const impactIdx = impactLevels.indexOf(impact);
    setActiveLikelihood(VISUAL_LIKELIHOOD_ORDER[likelihoodIdx]);
    setActiveImpact(VISUAL_IMPACT_ORDER[impactIdx]);
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
    } catch (_e) {
    } finally {
      setLoading(false);
    }
  };

  const hasSuggestion = suggestedLikelihood !== undefined && suggestedImpact !== undefined;
  const suggestionDiffers =
    hasSuggestion &&
    (suggestedLikelihood !== activeLikelihood || suggestedImpact !== activeImpact);

  const handleAcceptSuggestion = () => {
    if (!hasSuggestion) return;
    setActiveLikelihood(suggestedLikelihood);
    setActiveImpact(suggestedImpact);
  };

  const sectionActions =
    !readOnly && hasChanges ? (
      <Button onClick={handleSave} disabled={loading} loading={loading} size="sm">
        Save
      </Button>
    ) : undefined;

  const body = (
    <>
      <MatrixBody
        readOnly={readOnly}
        riskData={riskData}
        handleCellClick={handleCellClick}
        suggestedLikelihood={suggestedLikelihood}
        suggestedImpact={suggestedImpact}
      />
      {suggestionDiffers && !readOnly && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAcceptSuggestion}>
            Accept suggested residual
          </Button>
          <Text size="xs" variant="muted">
            Ghost cell shows the residual suggested by this entity&apos;s treatment plan.
          </Text>
        </div>
      )}
      {preliminary && (
        <div className="mt-2">
          <Text size="xs" variant="muted">
            Preliminary — assessment still running
          </Text>
        </div>
      )}
      <div className="mt-3">
        <MatrixLegend />
      </div>
    </>
  );

  // When titleInfo is present, we render the title manually so we can inject an info icon.
  // The DS Section's `title` prop only accepts `string`, so when titleInfo is set we omit
  // `title` and render our own heading row. When no titleInfo, fall back to the normal prop.
  if (titleInfo) {
    return (
      <Section description={description} actions={sectionActions}>
        <div className="flex items-start justify-between gap-4 -mt-2 mb-2">
          <HStack gap="xs" align="center">
            <h3 className="text-base font-semibold leading-none tracking-tight">{title}</h3>
            <AxisTooltip
              label={
                <Information
                  aria-label="About this chart"
                  className="h-4 w-4 text-muted-foreground"
                />
              }
              definition={titleInfo}
            />
          </HStack>
        </div>
        {body}
      </Section>
    );
  }

  return (
    <Section title={title} description={description} actions={sectionActions}>
      {body}
    </Section>
  );
}
