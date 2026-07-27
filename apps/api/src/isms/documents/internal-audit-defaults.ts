import type { SeedAuditControlDefinition } from './types';

/**
 * Default text for the Internal Audit document (clause 9.2, CS-724). Every
 * field ships with auditor-defensible template text a layperson can accept
 * unedited; the customer may edit any of it. Kept ASCII-safe for the PDF
 * renderer (jsPDF standard fonts cannot render characters like ≥).
 */

/** The Programme paragraph, rendered verbatim into the generated document. */
export function defaultProgrammeText(organizationName: string): string {
  return `${organizationName} runs an annual internal audit of the whole ISMS. Each audit checks conformity to ISO/IEC 27001:2022 and effective implementation of the controls in the Statement of Applicability. Findings are tracked to closure through the platform and reviewed at the next management review.`;
}

/** Default Scope for a new audit instance. */
export const DEFAULT_AUDIT_SCOPE =
  'The whole ISMS as defined in the ISMS Scope Statement (Clause 4.3).';

/** Default Criteria for a new audit instance. */
export const DEFAULT_AUDIT_CRITERIA =
  'ISO/IEC 27001:2022 and the Statement of Applicability.';

/**
 * The bracketed verdict choices in the conclusion template: "Overall, this
 * audit found the ISMS to [...] to ISO/IEC 27001:2022."
 */
export const CONCLUSION_VERDICT_TEXT: Record<string, string> = {
  conform: 'conform',
  substantially_conform:
    'substantially conform with the non-conformities recorded below',
  not_yet_conform: 'not yet conform',
};

/** Assemble the rendered conclusion sentence for a chosen verdict. */
export function conclusionSentence(verdict: string): string {
  const choice = CONCLUSION_VERDICT_TEXT[verdict] ?? verdict;
  return `Overall, this audit found the ISMS to ${choice} to ISO/IEC 27001:2022. Corrective actions are tracked in the findings table.`;
}

/**
 * The fifteen default Controls Tested rows seeded per audit, covering the
 * most-probed management-system clauses and high-impact Annex A controls.
 * "Where to find it" entries begin with "Comp AI" to signal the default
 * location; the customer overwrites the field when evidence lives elsewhere.
 * Seeding is idempotent by controlKey (seedAuditControlsIfMissing) and never
 * overwrites customer edits.
 */
export const SEED_AUDIT_CONTROL_DEFINITIONS: SeedAuditControlDefinition[] = [
  {
    controlKey: 'clause_4_1_context',
    controlRef: 'Clause 4.1 Context',
    whatWasTested:
      'Whether the org has identified internal and external issues affecting the ISMS.',
    whereToFind: 'Comp AI > ISMS > Documents > Context of the Organization',
  },
  {
    controlKey: 'clause_4_3_scope',
    controlRef: 'Clause 4.3 Scope',
    whatWasTested:
      'Whether the ISMS scope is documented, current, and reflects the certificate scope statement.',
    whereToFind: 'Comp AI > ISMS > Documents > ISMS Scope Statement',
  },
  {
    controlKey: 'clause_5_2_policy',
    controlRef: 'Clause 5.2 Policy',
    whatWasTested:
      'Whether the information security policy is documented, approved, and communicated.',
    whereToFind: 'Comp AI > Policies > Information Security & Privacy Governance',
  },
  {
    controlKey: 'clause_6_1_risk',
    controlRef: 'Clause 6.1 Risk',
    whatWasTested:
      'Whether risks affecting the ISMS are identified, assessed, and have a recorded treatment.',
    whereToFind: 'Comp AI > Risks (risk register)',
  },
  {
    controlKey: 'clause_7_2_competence',
    controlRef: 'Clause 7.2 Competence',
    whatWasTested:
      'Whether the competence of persons doing ISMS work is defined and evidenced.',
    whereToFind: 'Comp AI > ISMS > Roles > per-holder competence records',
  },
  {
    controlKey: 'clause_8_1_operational_planning',
    controlRef: 'Clause 8.1 Operational planning',
    whatWasTested:
      'Whether ISMS processes have been planned, implemented, and controlled.',
    whereToFind: 'Comp AI > Policies + Controls + Tasks',
  },
  {
    controlKey: 'clause_9_1_monitoring',
    controlRef: 'Clause 9.1 Monitoring',
    whatWasTested:
      'Whether info-security performance and ISMS effectiveness are being measured.',
    whereToFind: 'Comp AI > ISMS > Monitoring',
  },
  {
    controlKey: 'clause_9_3_management_review',
    controlRef: 'Clause 9.3 Management review',
    whatWasTested:
      'Whether top management reviews the ISMS at planned intervals with required inputs and outputs.',
    whereToFind: 'Comp AI > ISMS > Management Review',
  },
  {
    controlKey: 'a_5_1_policies',
    controlRef: 'A.5.1 Policies',
    whatWasTested:
      'Whether an information security policy set is defined, approved, published and reviewed.',
    whereToFind: 'Comp AI > Policies (full list)',
  },
  {
    controlKey: 'a_5_15_access_control',
    controlRef: 'A.5.15 Access control',
    whatWasTested:
      'Whether access rights are granted, reviewed and removed on a defined basis.',
    whereToFind:
      'Comp AI > Policies > Access Control & Least Privilege + related evidence tasks',
  },
  {
    controlKey: 'a_5_19_supplier_relationships',
    controlRef: 'A.5.19 Supplier relationships',
    whatWasTested:
      'Whether information-security risks associated with suppliers are identified and managed.',
    whereToFind:
      'Comp AI > Vendors > vendor register + Comp AI > Policies > Vendor & Third-Party Risk',
  },
  {
    controlKey: 'a_5_24_incident_management',
    controlRef: 'A.5.24 Incident management',
    whatWasTested:
      'Whether an information-security incident management process is defined and evidenced.',
    whereToFind:
      'Comp AI > Policies > Incident Response & Breach Notification + Comp AI > Findings',
  },
  {
    controlKey: 'a_8_7_malware',
    controlRef: 'A.8.7 Malware',
    whatWasTested:
      'Whether protection against malware is in place and supported by user awareness.',
    whereToFind:
      'Comp AI > Policies > Security Configuration Hardening & Anti-Malware',
  },
  {
    controlKey: 'a_8_13_backup',
    controlRef: 'A.8.13 Backup',
    whatWasTested:
      'Whether backups of information, software and systems are taken and tested.',
    whereToFind:
      "Comp AI > Evidence tasks tagged 'backup' + Comp AI > Policies > Backup, Business Continuity & DR",
  },
  {
    controlKey: 'a_8_24_cryptography',
    controlRef: 'A.8.24 Cryptography',
    whatWasTested:
      'Whether rules for the effective use of cryptography are defined and applied.',
    whereToFind: 'Comp AI > Policies > Encryption & Crypto Controls',
  },
];

export const SEED_AUDIT_CONTROL_KEYS = SEED_AUDIT_CONTROL_DEFINITIONS.map(
  (control) => control.controlKey,
);
