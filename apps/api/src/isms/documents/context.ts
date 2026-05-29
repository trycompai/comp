import {
  deriveContextIssues,
  type ContextDerivationInput,
} from '../utils/context-derivation';
import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput, IsmsPlatformData } from './types';

/** Adapt the shared platform data to the 4.1 derivation input. */
function toContextInput(data: IsmsPlatformData): ContextDerivationInput {
  return {
    frameworkNames: data.frameworkNames,
    vendorCount: data.vendorCount,
    subProcessorCount: data.subProcessorCount,
    vendorsByCategory: data.vendorsByCategory,
    memberCount: data.memberCount,
    membersByDepartment: data.membersByDepartment,
    deviceCount: data.deviceCount,
  };
}

/** Re-export the 4.1 derivation under the per-document module. */
export function deriveContextOfOrganization(data: IsmsPlatformData) {
  return deriveContextIssues(toContextInput(data));
}

export function buildContextSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const external = input.contextIssues.filter((i) => i.kind === 'external');
  const internal = input.contextIssues.filter((i) => i.kind === 'internal');

  const toSection = (
    heading: string,
    issues: typeof input.contextIssues,
  ): IsmsExportSection => ({
    heading,
    emptyText: 'No issues recorded.',
    paragraphs: issues.flatMap((issue, index) => [
      { text: `${index + 1}. ${issue.description}`, bold: true },
      { label: 'Effect: ', text: issue.effect },
    ]),
  });

  return [
    toSection('External issues', external),
    toSection('Internal issues', internal),
  ];
}
