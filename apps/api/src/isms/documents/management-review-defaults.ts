import type { SeedReviewInputDefinition } from './types';

/**
 * Default text for the Management Review document (clause 9.3, CS-726). Every
 * field ships with auditor-defensible template text a layperson can accept
 * unedited; the customer may edit any of it. Kept ASCII-safe for the PDF
 * renderer (jsPDF standard fonts cannot render characters like ≥).
 */

/** The Procedure paragraph, rendered verbatim into the generated document. */
export function defaultProcedureText(organizationName: string): string {
  return `${organizationName} holds a management review of the ISMS at least annually, and additionally after any major incident or significant change. The review is chaired by top management, considers the inputs required by ISO 27001 Clause 9.3.2, and records the outputs required by Clause 9.3.3. Minutes are retained in Comp AI.`;
}

/** Default "Decisions on continual improvement" text for a new review (9.3.3). */
export const DEFAULT_REVIEW_DECISIONS_TEXT =
  'Decisions taken at this review to pursue continual improvement of the ISMS are recorded below.';

/** Default "ISMS changes required" text for a new review (9.3.3). */
export const DEFAULT_REVIEW_CHANGES_TEXT =
  'No changes to the ISMS scope, policy, objectives, controls, or resources were agreed at this review, other than those captured in the actions arising.';

/**
 * The bracketed verdict choices in the conclusion template: "...the ISMS was
 * found to be [suitable / adequate / effective] and no changes are required
 * except those recorded in the outputs section below."
 */
export const REVIEW_CONCLUSION_VERDICT_TEXT: Record<string, string> = {
  suitable: 'suitable',
  adequate: 'adequate',
  effective: 'effective',
};

/** Assemble the rendered conclusion sentence for a chosen verdict. */
export function reviewConclusionSentence({
  verdict,
  meetingDate,
}: {
  verdict: string;
  /** 'YYYY-MM-DD', or null while the meeting date has not been entered. */
  meetingDate: string | null;
}): string {
  const choice = REVIEW_CONCLUSION_VERDICT_TEXT[verdict] ?? verdict;
  const reviewed = meetingDate
    ? `The information security management system was reviewed on ${meetingDate}.`
    : 'The information security management system was reviewed.';
  return `${reviewed} Overall, the ISMS was found to be ${choice} and no changes are required except those recorded in the outputs section below.`;
}

/**
 * The ten default Inputs (9.3.2) rows seeded per review: inputs (a) through
 * (g), with (d) split into its four sub-inputs. The table is the meeting
 * agenda — working through it in order covers everything ISO requires.
 * "Where to find it" entries begin with "Comp AI" to signal the default
 * location; the customer overwrites the field when evidence lives elsewhere.
 * Seeding is idempotent by inputKey (seedReviewInputsIfMissing) and never
 * overwrites customer edits.
 */
export const SEED_REVIEW_INPUT_DEFINITIONS: SeedReviewInputDefinition[] = [
  {
    inputKey: 'a_prior_actions',
    inputRef: '(a) Prior actions',
    whatItCovers: 'Status of actions from previous management reviews.',
    whereToFind: 'Comp AI > ISMS > Management Review',
  },
  {
    inputKey: 'b_context_changes',
    inputRef: '(b) Context changes',
    whatItCovers:
      'Changes in external and internal issues relevant to the ISMS.',
    whereToFind: 'Comp AI > ISMS > Documents > Context of the Organization',
  },
  {
    inputKey: 'c_interested_party_changes',
    inputRef: '(c) Interested-party changes',
    whatItCovers: 'Changes in needs and expectations of interested parties.',
    whereToFind:
      'Comp AI > ISMS > Documents > Interested Parties Register & Requirements',
  },
  {
    inputKey: 'd1_nonconformity_trends',
    inputRef: '(d.1) Nonconformity trends',
    whatItCovers: 'Trends in nonconformities and corrective actions.',
    whereToFind: 'Comp AI > Findings',
  },
  {
    inputKey: 'd2_monitoring_results',
    inputRef: '(d.2) Monitoring results',
    whatItCovers: 'Monitoring and measurement results.',
    whereToFind: 'Comp AI > ISMS > Monitoring',
  },
  {
    inputKey: 'd3_audit_results',
    inputRef: '(d.3) Audit results',
    whatItCovers: 'Results of internal audits.',
    whereToFind: 'Comp AI > ISMS > Internal Audit',
  },
  {
    inputKey: 'd4_objectives_fulfilment',
    inputRef: '(d.4) Objectives fulfilment',
    whatItCovers:
      'Extent to which information security objectives have been met.',
    whereToFind: 'Comp AI > ISMS > Documents > Objectives Plan',
  },
  {
    inputKey: 'e_interested_party_feedback',
    inputRef: '(e) Interested-party feedback',
    whatItCovers:
      'Feedback received from interested parties (customers, vendors, regulators).',
    whereToFind: 'Comp AI > Vendors (reviews) + external channels',
  },
  {
    inputKey: 'f_risk_assessment',
    inputRef: '(f) Risk assessment',
    whatItCovers:
      'Results of risk assessment and status of the risk-treatment plan.',
    whereToFind: 'Comp AI > Risks (risk register)',
  },
  {
    inputKey: 'g_improvement_opportunities',
    inputRef: '(g) Improvement opportunities',
    whatItCovers:
      'Opportunities for continual improvement raised at the meeting or before.',
    whereToFind: 'Comp AI > Findings (tagged OFI) + ideas raised at this meeting',
  },
];

export const SEED_REVIEW_INPUT_KEYS = SEED_REVIEW_INPUT_DEFINITIONS.map(
  (input) => input.inputKey,
);
