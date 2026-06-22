/**
 * Step definitions for the ISMS setup wizard (CS-438). The 12 wizard questions
 * are grouped into 6 ordered steps. Each step declares the form fields it owns so
 * the orchestrator can validate just that slice on Next and POST only the changed
 * answers for that step.
 */

import type { PartialWizardAnswers, WizardFormValues } from './wizard-types';

export type WizardFieldName = keyof WizardFormValues;

export interface WizardStepDef {
  id: string;
  title: string;
  /** The form fields this step edits (used for per-step validation + partial save). */
  fields: WizardFieldName[];
}

export const WIZARD_STEPS: WizardStepDef[] = [
  {
    id: 'leadership',
    title: 'Leadership & accountability',
    fields: ['deputySpo', 'internalAuditApproach'],
  },
  {
    id: 'commitments',
    title: 'External commitments',
    fields: ['certificationBody', 'insurance', 'sectorRegulators'],
  },
  {
    id: 'scope',
    title: 'Workforce & scope',
    fields: ['hasContractors', 'capabilitiesInProduction', 'cloudScopeSplit'],
  },
  {
    id: 'privacy',
    title: 'Privacy & data',
    fields: ['euRep'],
  },
  {
    id: 'certificate',
    title: 'Certificate scope',
    fields: ['certificateScopeSentence'],
  },
  {
    id: 'outcomes',
    title: 'Targets & outcomes',
    fields: ['objectives', 'intendedOutcomes'],
  },
];

/** Pick only the given step's fields out of the full form values (partial save body). */
export function pickStepAnswers({
  values,
  fields,
}: {
  values: WizardFormValues;
  fields: WizardFieldName[];
}): Partial<WizardFormValues> {
  return fields.reduce<Partial<WizardFormValues>>(
    (slice, field) => Object.assign(slice, { [field]: values[field] }),
    {},
  );
}

/**
 * Resolve which step to open on when the wizard is reopened. A step counts as
 * saved once every one of its fields is present in the persisted answers — each
 * Next / Save progress POSTs that step's full field slice, so saved steps form a
 * prefix of the rail. Returns the first not-yet-saved step (so the progress rail
 * and the pre-filled answers stay in sync), the last step when everything is
 * saved, and step 0 when nothing is saved.
 */
export function resumeStepIndex({
  answers,
}: {
  answers: PartialWizardAnswers | null;
}): number {
  if (!answers) return 0;
  const firstUnsaved = WIZARD_STEPS.findIndex(
    (step) => !step.fields.every((field) => answers[field] !== undefined),
  );
  return firstUnsaved === -1 ? WIZARD_STEPS.length - 1 : firstUnsaved;
}
