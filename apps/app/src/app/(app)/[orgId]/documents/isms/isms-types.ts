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
  | 'objectives_plan'
  | 'monitoring'
  | 'internal_audit';

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
  controlLinks: IsmsControlLink[];
  /** Working-draft narrative (Scope, Leadership, Internal Audit programme). */
  draftNarrative:
    | IsmsScopeNarrative
    | IsmsLeadershipNarrative
    | IsmsInternalAuditNarrative
    | Record<string, unknown>
    | null;
  currentVersionId: string | null;
  currentVersion: IsmsCurrentVersion | null;
}

export interface IsmsDriftResult {
  isStale: boolean;
  changedSources: string[];
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
];

/** Map a URL slug (e.g. "context-of-organization") to the canonical type. */
export const ISMS_SLUG_TO_TYPE: Record<string, IsmsDocumentType> = {
  'context-of-organization': 'context_of_organization',
  'interested-parties': 'interested_parties_register',
  requirements: 'interested_parties_requirements',
  scope: 'isms_scope',
  leadership: 'leadership_commitment',
  roles: 'roles_and_responsibilities',
  objectives: 'objectives_plan',
  monitoring: 'monitoring',
  'internal-audit': 'internal_audit',
};

/** Inverse of ISMS_SLUG_TO_TYPE for fast type -> slug lookup. */
const ISMS_TYPE_TO_SLUG: Record<IsmsDocumentType, string> = {
  context_of_organization: 'context-of-organization',
  interested_parties_register: 'interested-parties',
  interested_parties_requirements: 'requirements',
  isms_scope: 'scope',
  leadership_commitment: 'leadership',
  roles_and_responsibilities: 'roles',
  objectives_plan: 'objectives',
  monitoring: 'monitoring',
  internal_audit: 'internal-audit',
};

export function slugToType(slug: string): IsmsDocumentType | undefined {
  return ISMS_SLUG_TO_TYPE[slug];
}

export function ismsTypeToSlug(type: IsmsDocumentType): string {
  return ISMS_TYPE_TO_SLUG[type];
}

export const ISO27001_NAMES = ['ISO 27001', 'iso27001', 'ISO27001'];
