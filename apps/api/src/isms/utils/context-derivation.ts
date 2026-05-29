import type { IsmsContextIssueKind, IsmsContextSource } from '@db';

/**
 * Deterministic derivation of "Context of the Organization" (ISO 27001 clause 4.1)
 * internal & external issues from platform data. No AI — the same inputs always
 * produce the same set of issues, so drift detection is a pure comparison of the
 * captured snapshot against a freshly recomputed snapshot.
 */

/** Raw platform data the derivation reads. Captured verbatim as the sourceSnapshot. */
export interface ContextDerivationInput {
  /** Names of the frameworks the organization is actively pursuing. */
  frameworkNames: string[];
  /** Total third-party vendors tracked in the org. */
  vendorCount: number;
  /** Vendors flagged as sub-processors. */
  subProcessorCount: number;
  /** Vendor counts keyed by category (e.g. cloud, software_as_a_service). */
  vendorsByCategory: Record<string, number>;
  /** Total active (non-deactivated) workforce members. */
  memberCount: number;
  /** Member counts keyed by department (e.g. it, hr, gov). */
  membersByDepartment: Record<string, number>;
  /** Total managed endpoints/devices. */
  deviceCount: number;
}

/** A single derived issue, ready to be written as an IsmsContextIssue row. */
export interface DerivedContextIssue {
  kind: IsmsContextIssueKind;
  description: string;
  effect: string;
  source: IsmsContextSource;
  derivedFrom: string;
  position: number;
}

/** The snapshot persisted onto the version for later drift comparison. */
export type ContextSourceSnapshot = ContextDerivationInput;

function buildExternalIssues(
  input: ContextDerivationInput,
): Array<Omit<DerivedContextIssue, 'position'>> {
  const issues: Array<Omit<DerivedContextIssue, 'position'>> = [];

  for (const name of input.frameworkNames) {
    issues.push({
      kind: 'external',
      description: `Compliance obligations arising from the ${name} framework that the organization is pursuing.`,
      effect: `The ISMS must implement and evidence controls sufficient to satisfy ${name}, shaping ISMS objectives and the audit scope.`,
      source: 'derived',
      derivedFrom: `framework:${name}`,
    });
  }

  if (input.vendorCount > 0) {
    issues.push({
      kind: 'external',
      description: `Reliance on ${input.vendorCount} third-party vendor${input.vendorCount === 1 ? '' : 's'}${input.subProcessorCount > 0 ? `, of which ${input.subProcessorCount} act as sub-processor${input.subProcessorCount === 1 ? '' : 's'}` : ''}.`,
      effect:
        'Supplier risk and data-sharing arrangements extend the ISMS boundary and require vendor due diligence and ongoing monitoring.',
      source: 'derived',
      derivedFrom: 'vendors',
    });
  }

  if (input.subProcessorCount > 0) {
    issues.push({
      kind: 'external',
      description: `Personal or customer data is processed by ${input.subProcessorCount} sub-processor${input.subProcessorCount === 1 ? '' : 's'}, creating regulatory and data-protection obligations.`,
      effect:
        'The ISMS must address data-protection, breach-notification and contractual safeguards for data handled outside the organization.',
      source: 'derived',
      derivedFrom: 'subprocessors',
    });
  }

  return issues;
}

function buildInternalIssues(
  input: ContextDerivationInput,
): Array<Omit<DerivedContextIssue, 'position'>> {
  const issues: Array<Omit<DerivedContextIssue, 'position'>> = [];

  if (input.memberCount > 0) {
    const departments = Object.keys(input.membersByDepartment).filter(
      (dept) => dept !== 'none' && input.membersByDepartment[dept] > 0,
    );
    const departmentSummary =
      departments.length > 0 ? ` spanning ${departments.join(', ')}` : '';
    issues.push({
      kind: 'internal',
      description: `A workforce of ${input.memberCount} member${input.memberCount === 1 ? '' : 's'}${departmentSummary}.`,
      effect:
        'Headcount and organizational structure determine security awareness, segregation of duties and access-management needs within the ISMS.',
      source: 'derived',
      derivedFrom: 'members',
    });
  }

  const cloudVendors =
    (input.vendorsByCategory.cloud ?? 0) +
    (input.vendorsByCategory.infrastructure ?? 0) +
    (input.vendorsByCategory.software_as_a_service ?? 0);
  if (cloudVendors > 0) {
    issues.push({
      kind: 'internal',
      description: `A cloud-centric technology footprint built on ${cloudVendors} infrastructure and SaaS provider${cloudVendors === 1 ? '' : 's'}.`,
      effect:
        'The chosen architecture defines where data resides and which technical controls (encryption, access control, logging) the ISMS must enforce.',
      source: 'derived',
      derivedFrom: 'vendors',
    });
  }

  if (input.deviceCount > 0) {
    issues.push({
      kind: 'internal',
      description: `${input.deviceCount} managed endpoint${input.deviceCount === 1 ? '' : 's'} used by the workforce.`,
      effect:
        'Endpoint posture (encryption, patching, configuration) is a core ISMS objective and drives device-management controls.',
      source: 'derived',
      derivedFrom: 'devices',
    });
  } else {
    issues.push({
      kind: 'internal',
      description:
        'A predominantly remote working model with limited centrally-managed hardware.',
      effect:
        'Remote work shifts ISMS emphasis toward identity, endpoint and SaaS controls rather than physical security.',
      source: 'derived',
      derivedFrom: 'devices',
    });
  }

  return issues;
}

/**
 * Produce a lean, deterministic set of internal/external context issues from the
 * captured platform data. Position is assigned sequentially so the register has a
 * stable order.
 */
export function deriveContextIssues(
  input: ContextDerivationInput,
): DerivedContextIssue[] {
  const ordered = [
    ...buildExternalIssues(input),
    ...buildInternalIssues(input),
  ];
  return ordered.map((issue, index) => ({ ...issue, position: index }));
}

/** Compare two snapshots and report which derived sources changed (drift). */
export function diffSnapshots({
  previous,
  current,
}: {
  previous: ContextSourceSnapshot | null;
  current: ContextSourceSnapshot;
}): { isStale: boolean; changedSources: string[] } {
  if (!previous) {
    return { isStale: true, changedSources: ['no-baseline'] };
  }

  const changed: string[] = [];

  const sameStringSet = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    return a.every((item) => setB.has(item));
  };

  if (!sameStringSet(previous.frameworkNames, current.frameworkNames)) {
    changed.push('frameworks');
  }
  if (previous.vendorCount !== current.vendorCount) {
    changed.push('vendors');
  }
  if (previous.subProcessorCount !== current.subProcessorCount) {
    changed.push('subprocessors');
  }
  if (previous.memberCount !== current.memberCount) {
    changed.push('members');
  }
  if (previous.deviceCount !== current.deviceCount) {
    changed.push('devices');
  }

  return { isStale: changed.length > 0, changedSources: changed };
}
