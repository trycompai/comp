'use client';

import { Progress, Stack, Text } from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';
import type { WizardStepDef } from './wizard-steps';

interface WizardProgressProps {
  steps: WizardStepDef[];
  currentStep: number;
}

type StepState = 'done' | 'current' | 'upcoming';

const MARKER_STYLES: Record<StepState, string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-primary bg-background text-primary',
  upcoming: 'border-border bg-background text-muted-foreground',
};

const CONNECTOR_STYLES: Record<'done' | 'upcoming', string> = {
  done: 'bg-primary',
  upcoming: 'bg-border',
};

function stepStateFor({ index, current }: { index: number; current: number }): StepState {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'upcoming';
}

function StepMarker({ index, state }: { index: number; state: StepState }) {
  return (
    <div
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors ${MARKER_STYLES[state]}`}
    >
      {state === 'done' ? <Checkmark size={16} /> : index + 1}
    </div>
  );
}

/**
 * Step indicator for the wizard: a numbered marker rail (done / current /
 * upcoming) above a DS Progress bar with a "Step X of Y" + percent label. Built
 * from DS primitives + semantic tokens only.
 */
export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const total = steps.length;
  const safeStep = Math.min(Math.max(currentStep, 0), total - 1);
  const percent = total > 0 ? Math.round(((safeStep + 1) / total) * 100) : 0;

  return (
    <Stack gap="4">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const state = stepStateFor({ index, current: safeStep });
          return (
            <div key={step.id} className="flex flex-1 items-center gap-2">
              <StepMarker index={index} state={state} />
              {index < total - 1 && (
                <div
                  className={`h-px flex-1 rounded-full ${
                    index < safeStep ? CONNECTOR_STYLES.done : CONNECTOR_STYLES.upcoming
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <Stack gap="2">
        <div className="flex items-baseline justify-between gap-3">
          <Text size="xs" variant="muted">
            Step {safeStep + 1} of {total}
          </Text>
          <Text size="xs" variant="muted">
            {percent}%
          </Text>
        </div>
        <Progress value={percent} aria-label="Wizard progress" />
      </Stack>
    </Stack>
  );
}
