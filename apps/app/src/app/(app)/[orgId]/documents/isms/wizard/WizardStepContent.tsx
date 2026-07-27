'use client';

import type { Control, FieldErrors } from 'react-hook-form';
import { WizardStepCertificate } from './WizardStepCertificate';
import { WizardStepCommitments } from './WizardStepCommitments';
import { WizardStepLeadership } from './WizardStepLeadership';
import { WizardStepOutcomes } from './WizardStepOutcomes';
import { WizardStepPrivacy } from './WizardStepPrivacy';
import { WizardStepScope } from './WizardStepScope';
import type {
  WizardDefaults,
  WizardFormValues,
  WizardMemberOption,
} from './wizard-types';

interface WizardStepContentProps {
  stepId: string;
  control: Control<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  members: WizardMemberOption[];
  defaults: WizardDefaults;
}

/** Renders the step body for the active step id. Keeps the orchestrator small. */
export function WizardStepContent({
  stepId,
  control,
  errors,
  members,
  defaults,
}: WizardStepContentProps) {
  switch (stepId) {
    case 'leadership':
      return <WizardStepLeadership control={control} members={members} />;
    case 'commitments':
      return (
        <WizardStepCommitments
          control={control}
          regulatorOptions={defaults.sectorRegulatorOptions}
        />
      );
    case 'scope':
      return <WizardStepScope control={control} defaults={defaults} />;
    case 'privacy':
      return <WizardStepPrivacy control={control} />;
    case 'certificate':
      return <WizardStepCertificate control={control} errors={errors} />;
    case 'outcomes':
      return <WizardStepOutcomes control={control} />;
    default:
      return null;
  }
}
