'use client';

import { suggestedResidual } from '@/lib/suggested-residual';
import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { Section, Stack } from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { DeltaChip } from './DeltaChip';
import { DescriptionEditor } from './DescriptionEditor';
import { LinkedWork } from './LinkedWork';
import { StrategyPicker } from './StrategyPicker';

export interface TreatmentPlanEntity {
  id: string;
  inherentLikelihood: Likelihood;
  inherentImpact: Impact;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  treatmentStrategy: RiskTreatmentType;
  treatmentStrategyDescription: string | null;
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    controls: { id: string; name: string }[];
  }[];
}

interface TreatmentPlanTabProps {
  orgId: string;
  entity: TreatmentPlanEntity;
  canUpdate: boolean;
  onUpdateStrategy: (strategy: RiskTreatmentType) => Promise<void>;
  onUpdateDescription: (description: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  regenerating: boolean;
}

export function TreatmentPlanTab({
  orgId,
  entity,
  canUpdate,
  onUpdateStrategy,
  onUpdateDescription,
  onRegenerate,
  regenerating,
}: TreatmentPlanTabProps) {
  const [strategy, setStrategy] = useState(entity.treatmentStrategy);

  useEffect(() => {
    setStrategy(entity.treatmentStrategy);
  }, [entity.treatmentStrategy]);

  const handleStrategyChange = async (next: RiskTreatmentType) => {
    setStrategy(next);
    try {
      await onUpdateStrategy(next);
    } catch {
      setStrategy(entity.treatmentStrategy);
    }
  };

  const suggestion = suggestedResidual({
    likelihood: entity.inherentLikelihood,
    impact: entity.inherentImpact,
    strategy,
    tasks: entity.tasks,
  });

  return (
    <Stack gap="lg">
      <Section title="Current risk">
        <DeltaChip
          inherentLikelihood={entity.inherentLikelihood}
          inherentImpact={entity.inherentImpact}
          residualLikelihood={entity.residualLikelihood}
          residualImpact={entity.residualImpact}
        />
      </Section>

      <Section title="Strategy" description="How is this risk being treated?">
        <StrategyPicker
          value={strategy}
          onChange={handleStrategyChange}
          disabled={!canUpdate}
        />
      </Section>

      <Section
        title="Treatment plan"
        description="A concrete plan for the strategy above. Use AI to draft, then edit by hand."
      >
        <DescriptionEditor
          value={entity.treatmentStrategyDescription ?? ''}
          onSave={onUpdateDescription}
          onRegenerate={onRegenerate}
          regenerating={regenerating}
          disabled={!canUpdate}
        />
      </Section>

      <Section
        title="Linked work"
        description={`Suggested residual based on your strategy and linked-task completion: ${suggestion.likelihood} × ${suggestion.impact} (${Math.round(suggestion.completion * 100)}% complete).`}
      >
        <LinkedWork orgId={orgId} tasks={entity.tasks} />
      </Section>
    </Stack>
  );
}
