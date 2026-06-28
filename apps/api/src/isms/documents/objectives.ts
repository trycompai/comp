import type { IsmsExportSection } from '../utils/export-shared';
import type {
  DerivedObjective,
  DocumentExportInput,
  IsmsPlatformData,
} from './types';

/**
 * Derive a small set of default information-security objectives (6.2) from active
 * frameworks, the risk register and the training programme. Deterministic so drift
 * is a pure snapshot comparison. Manual rows are preserved by the caller.
 */
export function deriveObjectives(data: IsmsPlatformData): DerivedObjective[] {
  // An explicitly-saved objectives array is the user's choice and must be
  // respected — even when it ends up empty after dropping blank-text rows.
  // Only fall through to the standard derived objectives when the field was
  // never set (undefined). Mirrors buildWizardDefaults, which preserves a saved
  // empty array rather than reseeding it from defaults.
  const savedObjectives = data.wizardAnswers.objectives;
  if (savedObjectives !== undefined) {
    return savedObjectives
      .filter((objective) => objective.objective?.trim())
      .map((objective, index) => ({
        objective: objective.objective,
        target: objective.target || null,
        cadence: null,
        plan: null,
        measurementMethod: null,
        source: 'derived',
        derivedFrom: 'wizard:objective',
        position: index,
      }));
  }

  const rows: Array<Omit<DerivedObjective, 'position'>> = [];

  for (const framework of data.frameworkNames) {
    rows.push({
      objective: `Maintain ${framework} compliance`,
      target: `Certified / conformant with ${framework}`,
      cadence: 'Annual',
      plan: `Operate the ISMS controls, complete internal audits and management reviews, and pass the ${framework} audit.`,
      measurementMethod: 'Audit outcome and number of non-conformities.',
      source: 'derived',
      derivedFrom: `framework:${framework}`,
    });
  }

  if (data.hasTrainingProgram || data.memberCount > 0) {
    rows.push({
      objective: 'Achieve high security-awareness training completion',
      target: 'Training completion ≥ 95%',
      cadence: 'Quarterly',
      plan: 'Assign annual security-awareness training to all staff and track completion through the platform.',
      measurementMethod: 'Percentage of staff who completed assigned training.',
      source: 'derived',
      derivedFrom: 'training',
    });
  }

  if (data.riskCount > 0) {
    rows.push({
      objective: 'Resolve high and critical risks within SLA',
      target:
        data.highRiskCount > 0
          ? `Remediate ${data.highRiskCount} high/critical risk${data.highRiskCount === 1 ? '' : 's'} within SLA`
          : 'No high/critical risks open beyond SLA',
      cadence: 'Monthly',
      plan: 'Triage risks in the register, assign owners and treatment plans, and track residual scores to closure.',
      measurementMethod: 'Number of high/critical risks open beyond their SLA.',
      source: 'derived',
      derivedFrom: 'risks',
    });
  }

  if (data.vendorCount > 0) {
    rows.push({
      objective: 'Complete scheduled vendor security reviews',
      target: '100% of in-scope vendors reviewed on schedule',
      cadence: 'Annual',
      plan: 'Maintain the vendor register, run periodic assessments and follow up on findings.',
      measurementMethod:
        'Percentage of vendors reviewed within the review window.',
      source: 'derived',
      derivedFrom: 'vendors',
    });
  }

  return rows.map((row, index) => ({ ...row, position: index }));
}

export function buildObjectivesSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  return [
    {
      heading: 'Information Security Objectives',
      emptyText: 'No objectives recorded.',
      table: {
        headers: [
          'Objective',
          'Target',
          'Plan',
          'Measurement',
          'Cadence',
          'Status',
        ],
        rows: input.objectives.map((objective) => [
          objective.objective,
          objective.target ?? '—',
          objective.plan ?? '—',
          objective.measurementMethod ?? '—',
          objective.cadence ?? '—',
          objective.status,
        ]),
      },
    },
  ];
}
