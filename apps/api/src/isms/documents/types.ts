import type { IsmsContextSource } from '@db';

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

/** Everything a section builder needs to render a document's export sections. */
export interface DocumentExportInput {
  contextIssues: Array<{ kind: string; description: string; effect: string }>;
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
}
