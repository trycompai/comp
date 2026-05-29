import type { IsmsDocumentType, Prisma } from '@db';
import { parseStoredAnswers } from '../wizard/wizard-schema';
import type { IsmsPlatformData } from './types';

/** Drift sources each document type derives from. Used to scope the diff. */
const TYPE_DRIFT_SOURCES: Record<IsmsDocumentType, Array<keyof DiffMap>> = {
  context_of_organization: [
    'frameworks',
    'vendors',
    'subprocessors',
    'members',
    'devices',
  ],
  interested_parties_register: [
    'frameworks',
    'vendors',
    'subprocessors',
    'members',
  ],
  interested_parties_requirements: [
    'frameworks',
    'vendors',
    'subprocessors',
    'members',
  ],
  objectives_plan: ['frameworks', 'vendors', 'risks', 'training'],
  isms_scope: ['frameworks', 'vendors', 'subprocessors', 'members'],
  leadership_commitment: ['organizationName'],
};

interface DiffMap {
  frameworks: boolean;
  vendors: boolean;
  subprocessors: boolean;
  members: boolean;
  devices: boolean;
  risks: boolean;
  training: boolean;
  organizationName: boolean;
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
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
    subprocessors: previous.subProcessorCount !== current.subProcessorCount,
    members: previous.memberCount !== current.memberCount,
    devices: previous.deviceCount !== current.deviceCount,
    risks:
      previous.riskCount !== current.riskCount ||
      previous.highRiskCount !== current.highRiskCount,
    training: previous.hasTrainingProgram !== current.hasTrainingProgram,
    organizationName: previous.organizationName !== current.organizationName,
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
