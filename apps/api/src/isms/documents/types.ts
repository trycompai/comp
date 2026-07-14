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
}
