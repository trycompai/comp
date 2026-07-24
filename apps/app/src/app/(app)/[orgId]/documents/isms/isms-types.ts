/**
 * Shared client-side types + constants for the ISMS Foundational Documents
 * feature (CS-437). Mirrors the NestJS `/v1/isms` contract and the Prisma
 * IsmsDocument / register models.
 */

export type IsmsDocumentType =
  | 'context_of_organization'
  | 'interested_parties_register'
  | 'interested_parties_requirements'
  | 'isms_scope'
  | 'leadership_commitment'
  | 'roles_and_responsibilities'
  | 'risk_assessment_methodology'
  | 'risk_treatment_plan'
  | 'objectives_plan'
  | 'monitoring'
  | 'internal_audit'
  | 'management_review';

export type IsmsDocumentStatus =
  | 'draft'
  | 'in_progress'
  | 'needs_review'
  | 'approved'
  | 'declined';

export type IsmsContextIssueKind = 'internal' | 'external';
export type IsmsContextSource = 'derived' | 'manual';
export type IsmsExportFormat = 'pdf' | 'docx';
export type IsmsObjectiveStatus = 'not_started' | 'on_track' | 'at_risk' | 'met';
export type IsmsCompetenceBasis =
  | 'education'
  | 'training'
  | 'experience'
  | 'combination';
export type IsmsAuditRoute = 'in_house' | 'external' | 'training_planned';
export type IsmsMetricCadence = 'monthly' | 'quarterly';
export type IsmsAuditStatus = 'planned' | 'in_progress' | 'complete';
export type IsmsAuditConclusionVerdict =
  | 'conform'
  | 'substantially_conform'
  | 'not_yet_conform';
export type IsmsAuditControlResult =
  | 'conformity_confirmed'
  | 'nonconformity_raised'
  | 'observation_raised'
  | 'not_sampled';
export type IsmsAuditFindingType = 'nc_major' | 'nc_minor' | 'ofi' | 'observation';
export type IsmsAuditFindingStatus = 'open' | 'in_progress' | 'closed';
export type IsmsReviewStatus = 'planned' | 'in_progress' | 'complete';
export type IsmsReviewConclusionVerdict = 'suitable' | 'adequate' | 'effective';
export type IsmsReviewActionStatus = 'open' | 'in_progress' | 'closed';

/**
 * The ISO 27001 clause 4.1 category taxonomy auditors expect, scoped by kind.
 * Mirrors the API derivation taxonomy (context-derivation.ts).
 */
export const EXTERNAL_ISSUE_CATEGORIES = [
  'Regulatory & Legal',
  'Market & Economic',
  'Technological',
  'Social & Cultural',
] as const;

export const INTERNAL_ISSUE_CATEGORIES = [
  'Governance & Structure',
  'Strategy & Objectives',
  'Capabilities & Resources',
  'Culture & Values',
] as const;

export function categoriesForKind(
  kind: IsmsContextIssueKind,
): readonly string[] {
  return kind === 'external'
    ? EXTERNAL_ISSUE_CATEGORIES
    : INTERNAL_ISSUE_CATEGORIES;
}

/** Register: Context of the Organization (clause 4.1). */
export interface IsmsContextIssue {
  id: string;
  kind: IsmsContextIssueKind;
  category: string | null;
  description: string;
  effect: string;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** Register: Interested Parties (clause 4.2a). */
export interface IsmsInterestedParty {
  id: string;
  name: string;
  category: string;
  needsExpectations: string;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** Register: Interested Parties Requirements & Treatment (clauses 4.2b/c). */
export interface IsmsInterestedPartyRequirement {
  id: string;
  interestedPartyId: string | null;
  partyName: string;
  requirement: string;
  treatment: string;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** Register: Information Security Objectives (clause 6.2). */
export interface IsmsObjective {
  id: string;
  objective: string;
  target: string | null;
  ownerMemberId: string | null;
  cadence: string | null;
  plan: string | null;
  measurementMethod: string | null;
  status: IsmsObjectiveStatus;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** A member assigned to an ISMS role, with competence evidence (clauses 5.3/7.2). */
export interface IsmsRoleAssignment {
  id: string;
  roleId: string;
  memberId: string;
  basisOfCompetence: IsmsCompetenceBasis | null;
  evidenceRetained: string | null;
  gap: string | null;
  remediationAction: string | null;
  remediationDueDate: string | null;
  position: number;
}

/** Register: ISMS Governance Roles, Responsibilities & Authorities (clause 5.3). */
export interface IsmsRole {
  id: string;
  roleKey: string | null;
  name: string;
  description: string;
  responsibilities: string;
  authorities: string;
  authorityGrantedBy: string;
  requiredCompetence: string;
  auditRoute: IsmsAuditRoute | null;
  auditRouteMemberId: string | null;
  auditFirmName: string | null;
  auditEvidenceRef: string | null;
  auditCourse: string | null;
  auditDueDate: string | null;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
  assignments: IsmsRoleAssignment[];
}

/** One recorded value for a monitoring metric (clause 9.1). Append-style
 * history: `recordedAt` and `enteredById` are server-set and immutable. */
export interface IsmsMeasurement {
  id: string;
  metricId: string;
  /** First day of the covered period (ISO date), aligned to the metric cadence. */
  periodStart: string;
  value: string;
  note: string | null;
  /** When the value was actually entered — the honest-backfill guardrail. */
  recordedAt: string;
  enteredById: string | null;
  source: string;
}

/** The Objectives-Plan row a metric's target may link to (clause 6.2 → 9.1). */
export interface IsmsMetricObjectiveRef {
  id: string;
  objective: string;
  target: string | null;
}

/** Register: Monitoring, Measurement, Analysis & Evaluation (clause 9.1). */
export interface IsmsMetric {
  id: string;
  /** Stable key for the nine seeded metrics; null for custom metrics. */
  metricKey: string | null;
  name: string;
  whatIsMeasured: string;
  method: string;
  cadence: IsmsMetricCadence | null;
  /** Null means "defaults to the SPO" (resolved at display/export time). */
  monitorMemberId: string | null;
  analyzeMemberId: string | null;
  target: string | null;
  objectiveId: string | null;
  objective: IsmsMetricObjectiveRef | null;
  /** Where values come from — always 'manual' in v1. */
  dataSource: string;
  isActive: boolean;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
  /** Anchors the missing-period walk for due/overdue/backfill. */
  createdAt: string;
  /** Full history, newest first (periodStart desc, recordedAt desc). */
  measurements: IsmsMeasurement[];
}

/** One sampled control in an audit's Controls Tested table (clause 9.2). */
export interface IsmsAuditControl {
  id: string;
  auditId: string;
  /** Stable key for the fifteen seeded rows; null for custom rows. */
  controlKey: string | null;
  controlRef: string;
  whatWasTested: string;
  whereToFind: string;
  /** Null until the auditor records an outcome. */
  result: IsmsAuditControlResult | null;
  notes: string | null;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** A finding raised during an audit (clause 9.2). */
export interface IsmsAuditFinding {
  id: string;
  auditId: string;
  /** Server-generated "F-NN", immutable. */
  reference: string;
  type: IsmsAuditFindingType;
  /** Optional link back to the Controls Tested row that raised it. */
  controlId: string | null;
  clauseOrControl: string | null;
  description: string;
  ownerMemberId: string | null;
  dueDate: string | null;
  status: IsmsAuditFindingStatus;
  closureEvidence: string | null;
  position: number;
}

/** Register: one internal audit instance (clause 9.2). */
export interface IsmsAudit {
  id: string;
  /** Server-generated "IA-YYYY-NN", immutable. */
  reference: string;
  scope: string;
  criteria: string;
  auditorName: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  status: IsmsAuditStatus;
  conclusionVerdict: IsmsAuditConclusionVerdict | null;
  conclusionNotes: string | null;
  signoffAuditorName: string | null;
  signoffAuditorDate: string | null;
  signoffSpoName: string | null;
  signoffSpoDate: string | null;
  signoffTopMgmtName: string | null;
  signoffTopMgmtDate: string | null;
  position: number;
  controls: IsmsAuditControl[];
  findings: IsmsAuditFinding[];
}

/** Narrative shape for the Internal Audit document: the Programme paragraph. */
export interface IsmsInternalAuditNarrative {
  programme: string;
}

/** Narrative shape for the Management Review document: the Procedure paragraph. */
export interface IsmsManagementReviewNarrative {
  procedure: string;
}

/** An attendee frozen at selection (clause 9.3): member id + display name. */
export interface IsmsReviewAttendee {
  memberId: string;
  name: string;
}

/** One row in a review's Inputs (9.3.2) table — the meeting agenda. */
export interface IsmsReviewInput {
  id: string;
  reviewId: string;
  /** Stable key for the ten seeded rows; null for custom rows. */
  inputKey: string | null;
  inputRef: string;
  whatItCovers: string;
  whereToFind: string;
  discussionNotes: string | null;
  discussed: boolean;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** An action arising from a management review (9.3.3 outputs). */
export interface IsmsReviewAction {
  id: string;
  reviewId: string;
  /** Server-generated per-review sequence ("A01"), immutable; displayed as
   * "MR-YYYY-NN-A01". */
  reference: string;
  description: string;
  ownerMemberId: string | null;
  dueDate: string | null;
  status: IsmsReviewActionStatus;
  position: number;
}

/** Register: one management review instance (clause 9.3). */
export interface IsmsManagementReview {
  id: string;
  /** Server-generated "MR-YYYY-NN", immutable. */
  reference: string;
  /** The date the review was held (backdatable, customer-entered). */
  meetingDate: string | null;
  /** Server-set at creation, immutable — the honest-backdating guardrail. */
  recordedAt: string;
  chairName: string | null;
  /** Attendees frozen at selection. Stored as JSON on the API side; consume
   * via parseAttendees (management-review-constants.ts) to guard stale shapes. */
  attendees: IsmsReviewAttendee[];
  status: IsmsReviewStatus;
  conclusionVerdict: IsmsReviewConclusionVerdict | null;
  conclusionNotes: string | null;
  decisionsText: string | null;
  changesText: string | null;
  signoffChairName: string | null;
  signoffChairDate: string | null;
  position: number;
  inputs: IsmsReviewInput[];
  actions: IsmsReviewAction[];
}

/** Narrative shape for the ISMS Scope singleton (clause 4.3). */
export interface IsmsScopeNarrative {
  certificateScopeSentence: string;
  inScope: string;
  interfaces: string[];
  dependencies: string[];
  exclusions: string[];
  justification?: string;
}

/** A single leadership commitment line (clause 5.1 (a)-(h)). */
export interface IsmsLeadershipCommitment {
  key: string;
  text: string;
}

/** Narrative shape for the Leadership and Commitment singleton (clause 5.1). */
export interface IsmsLeadershipNarrative {
  statement: string;
  commitments: IsmsLeadershipCommitment[];
}

/** Org control linked to an ISMS document (clause-level control mapping). */
export interface IsmsControlLink {
  id: string;
  controlId: string;
  control: { id: string; name: string };
}

/** The live/published version summary included on the fetched document (CS-701). */
export interface IsmsCurrentVersion {
  id: string;
  version: number;
  publishedAt: string | null;
}

/** A published version in the version-history feed (CS-701). */
export interface IsmsPublishedVersion {
  id: string;
  version: number;
  publishedAt: string | null;
  changelog: string | null;
  publishedByName: string | null;
  hasPdf: boolean;
  hasDocx: boolean;
  isCurrent: boolean;
}

/** Response of `GET /v1/isms/documents/:id/versions`. */
export interface IsmsVersionHistory {
  currentVersionId: string | null;
  versions: IsmsPublishedVersion[];
}

/** Summary row returned by `ensure-setup`. */
export interface IsmsSetupDocument {
  id: string;
  type: IsmsDocumentType;
  status: IsmsDocumentStatus;
  requirementId: string | null;
  hasApprovedVersion: boolean;
  /** Only on the monitoring row: active metrics currently overdue (CS-723). */
  overdueMetricCount?: number;
}

export interface IsmsEnsureSetupResponse {
  success: boolean;
  documents: IsmsSetupDocument[];
}

/**
 * Full document returned by `GET /v1/isms/documents/:id`. Every register array is
 * always present (empty when the document type does not use that register). The
 * editable draft lives on the document itself (register rows + `draftNarrative`);
 * `currentVersion` is the live/published version (CS-701). Version history is
 * fetched separately via `GET /v1/isms/documents/:id/versions`.
 */
export interface IsmsDocument {
  id: string;
  type: IsmsDocumentType;
  status: IsmsDocumentStatus;
  title: string;
  approverId: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  contextIssues: IsmsContextIssue[];
  interestedParties: IsmsInterestedParty[];
  interestedPartyRequirements: IsmsInterestedPartyRequirement[];
  objectives: IsmsObjective[];
  roles: IsmsRole[];
  metrics: IsmsMetric[];
  audits: IsmsAudit[];
  reviews: IsmsManagementReview[];
  controlLinks: IsmsControlLink[];
  /** Working-draft narrative (Scope, Leadership, Internal Audit programme,
   * Management Review procedure). */
  draftNarrative:
    | IsmsScopeNarrative
    | IsmsLeadershipNarrative
    | IsmsInternalAuditNarrative
    | IsmsManagementReviewNarrative
    | Record<string, unknown>
    | null;
  currentVersionId: string | null;
  currentVersion: IsmsCurrentVersion | null;
}

export interface IsmsDriftResult {
  isStale: boolean;
  changedSources: string[];
}

/**
 * Narrative shape for the Risk Assessment Methodology document (6.1.2).
 * Mirrors riskMethodologyNarrativeSchema in the API — every field is
 * customer-editable seeded text; scale/option labels and the 5x5 matrix render
 * from fixed constants because they describe how the platform actually
 * computes risk levels.
 */
export interface IsmsRiskMethodologyNarrative {
  purpose: string;
  scope: string;
  approach: string;
  likelihoodDescriptions: string[];
  impactDescriptions: string[];
  acceptanceThresholds: string[];
  treatmentOptions: string[];
  responsibilities: string;
  frequency: string;
  documentation: string;
}

/** How a risk's / vendor's latest acceptance stands relative to its live residual rating. */
export type IsmsAcceptanceState = 'accepted' | 'awaiting' | 'stale';

/** One Risk Register row of the Risk Treatment Plan (6.1.3), resolved server-side. */
export interface IsmsRiskTreatmentRow {
  reference: string;
  title: string;
  category: string;
  inherentLevel: string;
  treatment: string;
  controls: string;
  ownerName: string;
  residualLevel: string;
  acceptance: string;
  acceptanceState: IsmsAcceptanceState;
  status: string;
}

/** One vendor row of the Risk Treatment Plan's supplier table. */
export interface IsmsVendorTreatmentRow {
  name: string;
  category: string;
  inherentLevel: string;
  treatment: string;
  controls: string;
  ownerName: string;
  residualLevel: string;
  acceptance: string;
  acceptanceState: IsmsAcceptanceState;
  status: string;
}

/** GET /v1/isms/documents/:id/risk-treatment response. */
export interface IsmsRiskTreatmentData {
  risks: IsmsRiskTreatmentRow[];
  vendors: IsmsVendorTreatmentRow[];
  /** Submit-readiness messages (server-computed); empty = ready to submit. */
  validationMessages: string[];
}

/** Display metadata for each foundational-document card, keyed by type. */
export interface IsmsTypeMeta {
  type: IsmsDocumentType;
  clause: string;
  title: string;
  description: string;
  /** Whether this type has a working detail page (all six are enabled in CS-437). */
  detailRouteEnabled: boolean;
}

export const ISMS_TYPE_META: IsmsTypeMeta[] = [
  {
    type: 'context_of_organization',
    clause: '4.1',
    title: 'Context of the Organization',
    description:
      'Internal and external issues relevant to the ISMS and their effect on its objectives.',
    detailRouteEnabled: true,
  },
  {
    type: 'interested_parties_register',
    clause: '4.2',
    title: 'Interested Parties Register',
    description: 'The interested parties relevant to the information security management system.',
    detailRouteEnabled: true,
  },
  {
    type: 'interested_parties_requirements',
    clause: '4.2',
    title: 'Interested Parties Requirements',
    description: 'Requirements of interested parties relevant to information security.',
    detailRouteEnabled: true,
  },
  {
    type: 'isms_scope',
    clause: '4.3',
    title: 'ISMS Scope',
    description: 'The boundaries and applicability of the information security management system.',
    detailRouteEnabled: true,
  },
  {
    type: 'leadership_commitment',
    clause: '5.1',
    title: 'Leadership and Commitment',
    description: 'Evidence of top-management leadership and commitment to the ISMS.',
    detailRouteEnabled: true,
  },
  {
    type: 'roles_and_responsibilities',
    clause: '5.3',
    title: 'Roles, Responsibilities and Authorities',
    description:
      'ISMS governance roles, their responsibilities and authorities, and the members who hold them.',
    detailRouteEnabled: true,
  },
  {
    type: 'risk_assessment_methodology',
    clause: '6.1.2',
    title: 'Risk Assessment Methodology',
    description:
      'How risks are identified, analysed and evaluated — the scales, risk level matrix, acceptance thresholds and treatment options.',
    detailRouteEnabled: true,
  },
  {
    type: 'risk_treatment_plan',
    clause: '6.1.3',
    title: 'Risk Treatment Plan',
    description:
      'The treatment, controls, owner, residual state and owner acceptance for every risk — rendered from the Risk Register and Vendors.',
    detailRouteEnabled: true,
  },
  {
    type: 'objectives_plan',
    clause: '6.2',
    title: 'Information Security Objectives and Plan',
    description: 'Information security objectives and the plans to achieve them.',
    detailRouteEnabled: true,
  },
  {
    type: 'monitoring',
    clause: '9.1',
    title: 'Monitoring, Measurement, Analysis and Evaluation',
    description:
      'The metrics the organization monitors — what is measured, how, when, by whom, and who analyses the results.',
    detailRouteEnabled: true,
  },
  {
    type: 'internal_audit',
    clause: '9.2',
    title: 'Internal Audit',
    description:
      'The internal audit programme and the plan, controls tested, findings and conclusion of each audit.',
    detailRouteEnabled: true,
  },
  {
    type: 'management_review',
    clause: '9.3',
    title: 'Management Review',
    description:
      'The management review procedure and the minutes of each review — inputs considered, outputs, actions arising and chair sign-off.',
    detailRouteEnabled: true,
  },
];

/** Map a URL slug (e.g. "context-of-organization") to the canonical type. */
export const ISMS_SLUG_TO_TYPE: Record<string, IsmsDocumentType> = {
  'context-of-organization': 'context_of_organization',
  'interested-parties': 'interested_parties_register',
  requirements: 'interested_parties_requirements',
  scope: 'isms_scope',
  leadership: 'leadership_commitment',
  roles: 'roles_and_responsibilities',
  'risk-methodology': 'risk_assessment_methodology',
  'risk-treatment-plan': 'risk_treatment_plan',
  objectives: 'objectives_plan',
  monitoring: 'monitoring',
  'internal-audit': 'internal_audit',
  'management-review': 'management_review',
};

/** Inverse of ISMS_SLUG_TO_TYPE for fast type -> slug lookup. */
const ISMS_TYPE_TO_SLUG: Record<IsmsDocumentType, string> = {
  context_of_organization: 'context-of-organization',
  interested_parties_register: 'interested-parties',
  interested_parties_requirements: 'requirements',
  isms_scope: 'scope',
  leadership_commitment: 'leadership',
  roles_and_responsibilities: 'roles',
  risk_assessment_methodology: 'risk-methodology',
  risk_treatment_plan: 'risk-treatment-plan',
  objectives_plan: 'objectives',
  monitoring: 'monitoring',
  internal_audit: 'internal-audit',
  management_review: 'management-review',
};

export function slugToType(slug: string): IsmsDocumentType | undefined {
  return ISMS_SLUG_TO_TYPE[slug];
}

export function ismsTypeToSlug(type: IsmsDocumentType): string {
  return ISMS_TYPE_TO_SLUG[type];
}

export const ISO27001_NAMES = ['ISO 27001', 'iso27001', 'ISO27001'];
