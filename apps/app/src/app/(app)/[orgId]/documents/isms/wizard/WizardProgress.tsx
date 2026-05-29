'use client';

import { Badge, Progress, Text } from '@trycompai/design-system';
import type { WizardStepDef } from './wizard-steps';

interface WizardProgressProps {
  steps: WizardStepDef[];
  currentStep: number;
}

/**
 * Linear progress indicator for the wizard: a labelled bar plus the current step
 * title. Kept simple — the wizard itself is the polished surface.
 */
export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const total = steps.length;
  const safeStep = Math.min(Math.max(currentStep, 0), total - 1);
  const percent = total > 0 ? Math.round(((safeStep + 1) / total) * 100) : 0;
  const current = steps[safeStep];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Text size="sm" weight="semibold">
          {current?.title ?? 'Setup'}
        </Text>
        <Badge variant="secondary">
          Step {safeStep + 1} of {total}
        </Badge>
      </div>
      <Progress value={percent} aria-label="Wizard progress" />
    </div>
  );
}
