import type { IsmsContextSource } from '@db';
import type { PartialWizardAnswers } from '../wizard/wizard-schema';
import type { IsmsKeyValue } from '../utils/export-shared';

/**
 * Platform data shared by every ISMS document derivation. Collected once per
 * generate/drift/export call (always org-scoped) and passed to the per-document
 * handler. Captured verbatim as the version sourceSnapshot for drift detection.
 */
export interface IsmsPlatformData {
  organizationName: string;
  /** Names of frameworks the organization is actively pursuing. */
  frameworkNames: string[];
  /** Total third-party vendors. */
  vendorCount: number;
  /** Vendors flagged as sub-processors. */
  subProcessorCount: number;
  /** Vendor counts keyed by category (cloud, software_as_a_service, ...). */
  vendorsByCategory: Record<string, number>;
  /** Names of vendors flagged as sub-processors. */
  subProcessorNames: string[];
  /** Names of cloud/infrastructure vendors (key dependencies). */
  infraVendorNames: string[];
  /** Total active (non-deactivated) workforce members. */
  memberCount: number;
  /** Member counts keyed by department (it, hr, gov, ...). */
  membersByDepartment: Record<string, number>;
  /** Total managed endpoints/devices. */
  deviceCount: number;
  /** Total risks in the register. */
  riskCount: number;
  /** Risks at high/critical residual severity. */
  highRiskCount: number;
  /** Whether the org has any training/awareness content configured. */
  hasTrainingProgram: boolean;
  /**
   * The org's saved ISMS wizard answers (CS-438) for this framework. Threaded
   * into derivation so generated documents reflect the un-derivable inputs the
   * customer supplied. Empty object when the wizard has not been filled in.
   */
  wizardAnswers: PartialWizardAnswers;
  /**
   * Stable, order-insensitive fingerprint of the Interested Parties Register
   * rows (id + name + category). The Requirements document (4.2c) derives one
   * row per party, so a manual edit to a party — invisible to the rest of this
   * snapshot — must still flag requirements drift. Empty string when the
   * register has no rows yet.
   */
  partiesFingerprint: string;
  /**
   * Stable fingerprint of everything the Risk Treatment Plan (6.1.3) renders:
   * Risk Register rows, vendor risk fields, and acceptance events. Any change
   * to a risk's rating/treatment/owner, a vendor's risk fields, or a recorded
   * acceptance must flag RTP drift ("may be out of date"). Empty string when
   * there is nothing to render yet.
   */
  riskTreatmentFingerprint: string;
}

/** A row destined for one of the ISMS registers (interested parties, etc.). */
export interface DerivedRegisterRow {
  source: IsmsContextSource;
  derivedFrom: string;
  position: number;
}

export interface DerivedInterestedParty extends DerivedRegisterRow {
  name: string;
  category: string;
  needsExpectations: string;
}

export interface DerivedRequirement extends DerivedRegisterRow {
  interestedPartyId: string | null;
  partyName: string;
  requirement: string;
  treatment: string;
}

export interface DerivedObjective extends DerivedRegisterRow {
  objective: string;
  target: string | null;
  cadence: string | null;
  plan: string | null;
  measurementMethod: string | null;
}

/** Team-size band that drives the Roles document's copy and defaults (5.3). */
export type IsmsTeamSizeBand = 'small' | 'standard'; // small = 1-3 people, standard = 4+

/** The four seeded ISMS governance roles and their pre-filled default text. */
export interface SeedRoleDefinition {
  roleKey: 'top_management' | 'spo' | 'deputy_spo' | 'internal_auditor';
  name: string;
  description: string;
  responsibilities: string;
  authorities: string;
  authorityGrantedBy: string;
  requiredCompetence: string;
}

/** A role, resolved for export: fields + named holders + internal-audit route. */
export interface RoleExportRow {
  roleKey: string | null;
  name: string;
  description: string;
  responsibilities: string;
  authorities: string;
  authorityGrantedBy: string;
  requiredCompetence: string;
  /** Display names of the assigned members (resolved + frozen at build time). */
  holders: string[];
  auditRoute: string | null;
  auditRouteHolderName: string | null;
  auditFirmName: string | null;
  auditEvidenceRef: string | null;
  auditCourse: string | null;
  auditDueDate: string | null;
}

/** One row of the operational-responsibilities summary (5.3 §5). */
export interface OperationalOwnershipRow {
  artifact: string;
  assignedWhere: string;
  ownerResponsibility: string;
  /** Distinct owner display names read from the platform (may be empty). */
  owners: string[];
}

/** The nine seeded monitoring metrics and their pre-filled default text (9.1). */
export interface SeedMetricDefinition {
  metricKey: string;
  name: string;
  whatIsMeasured: string;
  method: string;
  cadence: 'monthly' | 'quarterly';
  target: string;
}

/** A metric, resolved for export: fields + named people + current value. */
export interface MetricExportRow {
  metricKey: string | null;
  name: string;
  whatIsMeasured: string;
  method: string;
  /** Humanized cadence ("Monthly"/"Quarterly") or null when unset. */
  cadence: string | null;
  /** Display name of who monitors / analyses (SPO fallback already applied). */
  monitorName: string;
  analyzeName: string;
  /** Free-text target, or the linked objective's target (frozen at build time). */
  target: string;
  /** Most recent value with its period, e.g. "99.95% (July 2026)", or "—". */
  currentValue: string;
}

/** The fifteen seeded Controls Tested rows and their pre-filled text (9.2). */
export interface SeedAuditControlDefinition {
  controlKey: string;
  controlRef: string;
  whatWasTested: string;
  whereToFind: string;
}

/** One Controls Tested row, resolved for export (result/notes humanized). */
export interface AuditControlExportRow {
  controlRef: string;
  whatWasTested: string;
  whereToFind: string;
  /** Humanized result label ("Conformity confirmed") or a dash when unset. */
  result: string;
  notes: string;
}

/** One finding row, resolved for export (owner name frozen at build time). */
export interface AuditFindingExportRow {
  reference: string;
  /** Humanized type label ("NC minor"). */
  type: string;
  clauseOrControl: string;
  description: string;
  ownerName: string;
  dueDate: string;
  /** Humanized status label ("Open"). */
  status: string;
  /** How a closed corrective action was evidenced; empty when not recorded. */
  closureEvidence: string;
}

/** One sign-off slot rendered in the audit's sign-off table. */
export interface AuditSignoffExportRow {
  role: string;
  name: string;
  date: string;
}

/** An audit instance, resolved for export: fields + child tables + sign-off. */
export interface AuditExportRow {
  reference: string;
  scope: string;
  criteria: string;
  auditorName: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  /** Humanized status label ("In progress"). */
  status: string;
  /** Assembled conclusion sentence, or null while no verdict is chosen. */
  conclusion: string | null;
  conclusionNotes: string | null;
  controls: AuditControlExportRow[];
  findings: AuditFindingExportRow[];
  signoffs: AuditSignoffExportRow[];
}

/** The ten seeded Inputs (9.3.2) rows and their pre-filled text (9.3). */
export interface SeedReviewInputDefinition {
  inputKey: string;
  inputRef: string;
  whatItCovers: string;
  whereToFind: string;
}

/** One Inputs (9.3.2) row, resolved for export (discussed humanized). */
export interface ReviewInputExportRow {
  inputRef: string;
  whatItCovers: string;
  whereToFind: string;
  discussionNotes: string;
  /** "Yes" once the input has been covered at the meeting, else "No". */
  discussed: string;
}

/** One action arising, resolved for export (owner name frozen at build time). */
export interface ReviewActionExportRow {
  /** Full display reference, e.g. "MR-2026-01-A01". */
  reference: string;
  description: string;
  ownerName: string;
  dueDate: string;
  /** Humanized status label ("Open"). */
  status: string;
}

/** A review instance, resolved for export: fields + child tables + sign-off. */
export interface ReviewExportRow {
  reference: string;
  meetingDate: string | null;
  /** Server-set recording date ("Recorded on"), never editable. */
  recordedOn: string;
  chairName: string;
  /** Attendee display names, frozen at selection. */
  attendees: string[];
  /** Humanized status label ("In progress"). */
  status: string;
  /** Assembled conclusion sentence, or null while no verdict is chosen. */
  conclusion: string | null;
  conclusionNotes: string | null;
  decisionsText: string | null;
  changesText: string | null;
  /** Single sign-off slot: the chair signs (empty strings while unsigned). */
  signoffChairName: string;
  signoffChairDate: string;
  inputs: ReviewInputExportRow[];
  actions: ReviewActionExportRow[];
  /**
   * Open actions from previous reviews, carried forward automatically to this
   * review's input (a). Computed from the earlier review instances at build
   * time — never copied, so their status keeps tracking to closure.
   */
  carriedForward: ReviewActionExportRow[];
}

/** How a risk's / vendor's latest acceptance stands relative to its live residual rating. */
export type AcceptanceExportState = 'accepted' | 'awaiting' | 'stale';

/** One Risk Register row, resolved for the Risk Treatment Plan (6.1.3). */
export interface RiskTreatmentExportRow {
  /** Display reference generated by register order at build time, e.g. "R-01". */
  reference: string;
  title: string;
  /** Humanized category label ("Vendor management"). */
  category: string;
  /** Level label of the inherent rating ("Medium"). */
  inherentLevel: string;
  /** Humanized treatment strategy ("Mitigate"). */
  treatment: string;
  /** The active treatment/controls description; "—" when none recorded. */
  controls: string;
  /** Owner display name (frozen at build time); "—" when unassigned. */
  ownerName: string;
  /** Level label of the residual rating ("Low"). */
  residualLevel: string;
  /** Rendered acceptance cell ("Accepted 2026-04-15 (Jane Doe)" / "Awaiting acceptance" / "Stale — ..."). */
  acceptance: string;
  acceptanceState: AcceptanceExportState;
  /** Humanized register status ("Open"); summarized in the section intro. */
  status: string;
}

/** One vendor row, resolved for the Risk Treatment Plan's supplier table. */
export interface VendorTreatmentExportRow {
  name: string;
  category: string;
  inherentLevel: string;
  treatment: string;
  controls: string;
  ownerName: string;
  residualLevel: string;
  acceptance: string;
  acceptanceState: AcceptanceExportState;
  status: string;
}

/**
 * The organization profile that fills the narrative parts of the Context of the
 * Organization document (clause 4.1) — overview table, mission, intended
 * outcomes. Assembled from onboarding Q&A + the ISMS wizard at export time.
 */
export interface IsmsOrgProfile {
  /** Key/value rows for the "Organization overview" table. */
  overview: IsmsKeyValue[];
  /** Company mission / description narrative, if captured. */
  mission: string | null;
  /** Intended outcomes of the ISMS (customer-edited wizard answers or defaults). */
  intendedOutcomes: string[];
}

/** Everything a section builder needs to render a document's export sections. */
export interface DocumentExportInput {
  contextIssues: Array<{
    kind: string;
    category: string | null;
    description: string;
    effect: string;
  }>;
  interestedParties: Array<{
    name: string;
    category: string;
    needsExpectations: string;
  }>;
  requirements: Array<{
    partyName: string;
    requirement: string;
    treatment: string;
  }>;
  objectives: Array<{
    objective: string;
    target: string | null;
    cadence: string | null;
    status: string;
    plan: string | null;
    measurementMethod: string | null;
  }>;
  narrative: unknown;
  /** Org overview/mission/outcomes — only populated for the Context document. */
  orgProfile?: IsmsOrgProfile;
  /** Governance roles with resolved holders — only populated for the Roles document (5.3). */
  roles?: RoleExportRow[];
  /** Operational per-artifact ownership — only populated for the Roles document (5.3). */
  operationalOwnership?: OperationalOwnershipRow[];
  /** Team-size band — only populated for the Roles document (5.3). */
  band?: IsmsTeamSizeBand;
  /** Active metrics with resolved people + values — only populated for the Monitoring document (9.1). */
  metrics?: MetricExportRow[];
  /** Audit instances with resolved names — only populated for the Internal Audit document (9.2). */
  audits?: AuditExportRow[];
  /** Review instances with resolved names — only populated for the Management Review document (9.3). */
  reviews?: ReviewExportRow[];
  /** Risk Register + vendor rows — only populated for the Risk Treatment Plan (6.1.3). */
  riskTreatment?: {
    risks: RiskTreatmentExportRow[];
    vendors: VendorTreatmentExportRow[];
  };
}
