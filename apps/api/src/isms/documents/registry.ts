import type { IsmsDocumentType } from '@db';
import type { ZodTypeAny } from 'zod';
import type { IsmsExportSection } from '../utils/export-shared';
import { buildContextSections } from './context';
import { buildInterestedPartiesSections } from './interested-parties';
import { buildRequirementsSections } from './requirements';
import { buildObjectivesSections } from './objectives';
import { buildRolesSections } from './roles';
import { buildMonitoringSections } from './monitoring';
import {
  buildScopeSections,
  deriveScopeNarrative,
  ismsScopeNarrativeSchema,
} from './scope';
import {
  buildLeadershipSections,
  deriveLeadershipNarrative,
  leadershipNarrativeSchema,
} from './leadership';
import type { DocumentExportInput, IsmsPlatformData } from './types';

/** Document types whose content is a singleton narrative stored in version.narrative. */
const NARRATIVE_TYPES: IsmsDocumentType[] = [
  'isms_scope',
  'leadership_commitment',
];

const EXPORT_SECTION_BUILDERS: Record<
  IsmsDocumentType,
  (input: DocumentExportInput) => IsmsExportSection[]
> = {
  context_of_organization: buildContextSections,
  interested_parties_register: buildInterestedPartiesSections,
  interested_parties_requirements: buildRequirementsSections,
  objectives_plan: buildObjectivesSections,
  roles_and_responsibilities: buildRolesSections,
  monitoring: buildMonitoringSections,
  isms_scope: buildScopeSections,
  leadership_commitment: buildLeadershipSections,
};

export function buildExportSections({
  type,
  input,
}: {
  type: IsmsDocumentType;
  input: DocumentExportInput;
}): IsmsExportSection[] {
  return EXPORT_SECTION_BUILDERS[type](input);
}

/** Zod schema validating the narrative payload for each singleton document type. */
export function narrativeSchemaForType(
  type: IsmsDocumentType,
): ZodTypeAny | null {
  if (type === 'isms_scope') return ismsScopeNarrativeSchema;
  if (type === 'leadership_commitment') return leadershipNarrativeSchema;
  return null;
}

/** Derive the default narrative payload for a singleton document type. */
export function deriveNarrativeForType({
  type,
  data,
}: {
  type: IsmsDocumentType;
  data: IsmsPlatformData;
}): Record<string, unknown> | null {
  if (type === 'isms_scope') return deriveScopeNarrative(data);
  if (type === 'leadership_commitment') return deriveLeadershipNarrative(data);
  return null;
}

export function isNarrativeType(type: IsmsDocumentType): boolean {
  return NARRATIVE_TYPES.includes(type);
}
