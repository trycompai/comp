import type {
  IsmsAudit,
  IsmsAuditConclusionVerdict,
  IsmsAuditControlResult,
  IsmsAuditFindingStatus,
  IsmsAuditFindingType,
  IsmsAuditStatus,
} from '../isms-types';

/**
 * Shared labels + the clause-9.2 client validation mirror for the Internal
 * Audit document (CS-724). The server enforces the same rules in
 * assertInternalAuditComplete (documents/internal-audit.ts) — keep in sync.
 */

export const AUDIT_STATUSES = ['planned', 'in_progress', 'complete'] as const;

export const AUDIT_STATUS_LABELS: Record<IsmsAuditStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  complete: 'Complete',
};

export const CONCLUSION_VERDICTS = [
  'conform',
  'substantially_conform',
  'not_yet_conform',
] as const;

/** The bracketed choices in the conclusion template, verbatim per the ticket. */
export const CONCLUSION_VERDICT_LABELS: Record<
  IsmsAuditConclusionVerdict,
  string
> = {
  conform: 'Conform',
  substantially_conform:
    'Substantially conform with the non-conformities recorded below',
  not_yet_conform: 'Not yet conform',
};

/** The assembled conclusion sentence shown in the read view + generated doc. */
export function conclusionSentence(verdict: IsmsAuditConclusionVerdict): string {
  const choice = CONCLUSION_VERDICT_LABELS[verdict];
  return `Overall, this audit found the ISMS to ${choice.charAt(0).toLowerCase()}${choice.slice(1)} to ISO/IEC 27001:2022. Corrective actions are tracked in the findings table.`;
}

export const CONTROL_RESULTS = [
  'conformity_confirmed',
  'nonconformity_raised',
  'observation_raised',
  'not_sampled',
] as const;

export const CONTROL_RESULT_LABELS: Record<IsmsAuditControlResult, string> = {
  conformity_confirmed: 'Conformity confirmed',
  nonconformity_raised: 'Non-conformity raised',
  observation_raised: 'Observation raised',
  not_sampled: 'Not sampled this cycle',
};

export const FINDING_TYPES = [
  'nc_major',
  'nc_minor',
  'ofi',
  'observation',
] as const;

export const FINDING_TYPE_LABELS: Record<IsmsAuditFindingType, string> = {
  nc_major: 'NC major',
  nc_minor: 'NC minor',
  ofi: 'OFI',
  observation: 'Observation',
};

/** Plain-English explanation of each finding type (the ticket's tooltip copy). */
export const FINDING_TYPE_DESCRIPTIONS: Record<IsmsAuditFindingType, string> = {
  nc_major:
    'Major non-conformity: a required process or control is missing or has broken down. Blocks certification until fixed.',
  nc_minor:
    'Minor non-conformity: a single lapse in an otherwise working control. Needs a corrective action with an owner and due date.',
  ofi: 'Opportunity for improvement: a suggestion to make a working control better. No corrective action required.',
  observation:
    'Observation: something worth recording or watching. No conformity impact yet.',
};

export const FINDING_STATUSES = ['open', 'in_progress', 'closed'] as const;

export const FINDING_STATUS_LABELS: Record<IsmsAuditFindingStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

/** Placeholder for the finding description field, verbatim per the ticket. */
export const FINDING_DESCRIPTION_PLACEHOLDER =
  "What the auditor observed. Keep to what happened, not what should happen. E.g. 'Three of ten sampled access reviews had no evidence of manager approval.'";

/**
 * Clause-9.2 readiness check — client mirror of the server submit gate
 * (auditValidationMessages in apps/api documents/internal-audit.ts).
 */
export function auditValidationMessages({
  audits,
}: {
  audits: Array<
    Pick<IsmsAudit, 'reference' | 'status' | 'conclusionVerdict'>
  >;
}): string[] {
  if (audits.length === 0) {
    return ['At least one internal audit must be recorded.'];
  }
  return audits
    .filter((audit) => audit.status === 'complete' && !audit.conclusionVerdict)
    .map(
      (audit) =>
        `Audit ${audit.reference} is complete but has no conclusion verdict.`,
    );
}

/** Read the Programme paragraph out of the document's draft narrative. */
export function parseProgramme(narrative: unknown): string {
  if (
    narrative &&
    typeof narrative === 'object' &&
    'programme' in narrative &&
    typeof (narrative as { programme: unknown }).programme === 'string'
  ) {
    return (narrative as { programme: string }).programme;
  }
  return '';
}
