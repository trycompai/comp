/**
 * Build the wizard form's initial values by layering saved answers over the
 * computed platform defaults (CS-438). Every field resolves to a concrete value
 * so the form is confirm-or-edit, never a blank page.
 */

import type {
  PartialWizardAnswers,
  WizardDefaults,
  WizardFormValues,
} from './wizard-types';

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Merge saved answers (may be null / partial) with the platform defaults into a
 * fully-populated form value. Saved answers always win over defaults; defaults
 * fill any gaps. Capabilities default to "all from defaults checked".
 */
export function buildWizardDefaults({
  answers,
  defaults,
}: {
  answers: PartialWizardAnswers | null;
  defaults: WizardDefaults;
}): WizardFormValues {
  const saved = answers ?? {};

  // Defaults seed only when objectives were never saved. A saved (even empty)
  // array is the user's choice and must be respected, not overwritten on reload.
  const objectives = Array.isArray(saved.objectives)
    ? saved.objectives.map((row) => ({
        objective: typeof row?.objective === 'string' ? row.objective : '',
        target: typeof row?.target === 'string' ? row.target : '',
      }))
    : defaults.objectives.map((row) => ({
        objective: row.objective,
        target: row.target,
      }));

  return {
    deputySpo: {
      memberId: saved.deputySpo?.memberId ?? null,
      toBeNamed: saved.deputySpo?.toBeNamed ?? false,
    },
    internalAuditApproach: saved.internalAuditApproach ?? null,
    certificationBody: saved.certificationBody ?? '',
    insurance: {
      has: saved.insurance?.has ?? false,
      insurerName: saved.insurance?.insurerName ?? '',
    },
    sectorRegulators: toStringArray(saved.sectorRegulators, []),
    hasContractors: saved.hasContractors ?? false,
    capabilitiesInProduction: toStringArray(
      saved.capabilitiesInProduction,
      defaults.capabilitiesInProduction,
    ),
    cloudScopeSplit: {
      customer: toStringArray(saved.cloudScopeSplit?.customer, defaults.cloudScopeSplit.customer),
      provider: toStringArray(saved.cloudScopeSplit?.provider, defaults.cloudScopeSplit.provider),
    },
    euRep: {
      status: saved.euRep?.status ?? 'not_required',
      name: saved.euRep?.name ?? '',
    },
    certificateScopeSentence:
      typeof saved.certificateScopeSentence === 'string' && saved.certificateScopeSentence.length > 0
        ? saved.certificateScopeSentence
        : defaults.certificateScopeSentence,
    objectives,
    intendedOutcomes: toStringArray(saved.intendedOutcomes, defaults.intendedOutcomes),
  };
}
