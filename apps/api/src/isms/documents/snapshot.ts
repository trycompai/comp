import type { IsmsDocumentType, Prisma } from '@db';
import type { PartialWizardAnswers } from '../wizard/wizard-schema';
import { parseStoredAnswers } from '../wizard/wizard-schema';
import type { IsmsPlatformData } from './types';

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
}

/** Order-insensitive comparison of count-by-key maps (vendor/department mix). */
function sameNumberRecord(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  }
  return true;
}

/**
 * Deep, key-order-independent comparison of the wizard answers blob. Several
 * documents derive rows from these un-derivable inputs, so any edit is drift.
 */
function sameWizardAnswers(
  a: PartialWizardAnswers,
  b: PartialWizardAnswers,
): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(',')}}`;
}

/**
 * Drift sources each document type derives from. Used to scope the diff so a
 * document is only flagged stale when an input it actually consumes changes.
 * Context (4.1) reads vendorsByCategory + membersByDepartment; objectives (6.2)
 * reads memberCount; several docs read the un-derivable wizard answers.
 */
const TYPE_DRIFT_SOURCES: Record<IsmsDocumentType, Array<keyof DiffMap>> = {
  context_of_organization: [
    'frameworks',
    'vendors',
    'vendorMix',
    'subprocessors',
    'members',
    'departmentMix',
    'devices',
    'wizardAnswers',
  ],
  interested_parties_register: [
    'frameworks',
    'vendors',
    'subprocessors',
    'members',
    'wizardAnswers',
  ],
  interested_parties_requirements: [
    'frameworks',
    'vendors',
    'subprocessors',
    'members',
    'wizardAnswers',
    // Requirements derive one row per Interested Parties Register party, so a
    // manual edit to a party (which the rest of this snapshot can't see) is drift.
    'parties',
  ],
  objectives_plan: [
    'frameworks',
    'vendors',
    'risks',
    'training',
    'members',
    'wizardAnswers',
  ],
  // Roles text is static defaults; the only platform input the 5.3 document
  // consumes is headcount, which sets the team-size band (small vs standard) and
  // so changes the team-size note + operational-responsibilities rendering.
  roles_and_responsibilities: ['members'],
  isms_scope: [
    'frameworks',
    'vendors',
    'subprocessors',
    'members',
    'wizardAnswers',
  ],
  leadership_commitment: ['organizationName', 'wizardAnswers'],
};

interface DiffMap {
  frameworks: boolean;
  vendors: boolean;
  vendorMix: boolean;
  subprocessors: boolean;
  members: boolean;
  departmentMix: boolean;
  devices: boolean;
  risks: boolean;
  training: boolean;
  organizationName: boolean;
  wizardAnswers: boolean;
  parties: boolean;
}

function computeChanges({
  previous,
  current,
}: {
  previous: IsmsPlatformData;
  current: IsmsPlatformData;
}): DiffMap {
  return {
    frameworks: !sameStringSet(previous.frameworkNames, current.frameworkNames),
    vendors: previous.vendorCount !== current.vendorCount,
    vendorMix: !sameNumberRecord(
      previous.vendorsByCategory,
      current.vendorsByCategory,
    ),
    subprocessors: previous.subProcessorCount !== current.subProcessorCount,
    members: previous.memberCount !== current.memberCount,
    departmentMix: !sameNumberRecord(
      previous.membersByDepartment,
      current.membersByDepartment,
    ),
    devices: previous.deviceCount !== current.deviceCount,
    risks:
      previous.riskCount !== current.riskCount ||
      previous.highRiskCount !== current.highRiskCount,
    training: previous.hasTrainingProgram !== current.hasTrainingProgram,
    organizationName: previous.organizationName !== current.organizationName,
    wizardAnswers: !sameWizardAnswers(
      previous.wizardAnswers,
      current.wizardAnswers,
    ),
    parties: previous.partiesFingerprint !== current.partiesFingerprint,
  };
}

/**
 * Compare two platform snapshots for a given document type, reporting only the
 * sources that document derives from. A missing baseline is always stale.
 */
export function diffPlatformSnapshots({
  type,
  previous,
  current,
}: {
  type: IsmsDocumentType;
  previous: IsmsPlatformData | null;
  current: IsmsPlatformData;
}): { isStale: boolean; changedSources: string[] } {
  if (!previous) {
    return { isStale: true, changedSources: ['no-baseline'] };
  }

  const changes = computeChanges({ previous, current });
  const relevant = TYPE_DRIFT_SOURCES[type];
  const changedSources = relevant.filter((source) => changes[source]);

  return { isStale: changedSources.length > 0, changedSources };
}

/** Parse a stored JSON snapshot back into IsmsPlatformData. */
export function parsePlatformSnapshot(
  value: Prisma.JsonValue | null | undefined,
): IsmsPlatformData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  // A platform snapshot always carries frameworkNames; older context-only
  // snapshots are compatible because they share the same keys.
  if (!('frameworkNames' in record)) return null;

  return {
    organizationName: toStr(record.organizationName, 'The organization'),
    frameworkNames: toStrArray(record.frameworkNames),
    vendorCount: toNum(record.vendorCount),
    subProcessorCount: toNum(record.subProcessorCount),
    vendorsByCategory: toNumRecord(record.vendorsByCategory),
    subProcessorNames: toStrArray(record.subProcessorNames),
    infraVendorNames: toStrArray(record.infraVendorNames),
    memberCount: toNum(record.memberCount),
    membersByDepartment: toNumRecord(record.membersByDepartment),
    deviceCount: toNum(record.deviceCount),
    riskCount: toNum(record.riskCount),
    highRiskCount: toNum(record.highRiskCount),
    hasTrainingProgram: record.hasTrainingProgram === true,
    wizardAnswers: parseStoredAnswers(record.wizardAnswers),
    partiesFingerprint: toStr(record.partiesFingerprint, ''),
  };
}

function toNum(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function toStr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function toStrArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toNumRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number') result[key] = item;
  }
  return result;
}
