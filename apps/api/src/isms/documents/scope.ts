import { z } from 'zod';
import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput, IsmsPlatformData } from './types';

/** Narrative shape persisted in IsmsDocumentVersion.narrative for isms_scope (4.3). */
export const ismsScopeNarrativeSchema = z.object({
  certificateScopeSentence: z.string(),
  inScope: z.string(),
  interfaces: z.array(z.string()),
  dependencies: z.array(z.string()),
  exclusions: z.array(z.string()),
  justification: z.string().optional(),
});

export type IsmsScopeNarrative = z.infer<typeof ismsScopeNarrativeSchema>;

/**
 * Collapse runs of whitespace to a single space and trim. Interpolated values
 * (org name, framework list) can carry stray/trailing whitespace, which would
 * otherwise produce double spaces in the assembled sentence (CS-437).
 */
function normalizeSentence(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim();
}

/**
 * Derive a default ISMS scope statement (4.3) from platform data. The certificate
 * scope sentence is templated from the org name + active frameworks; interfaces
 * come from vendors and dependencies from sub-processors + key infra vendors.
 */
export function deriveScopeNarrative(
  data: IsmsPlatformData,
): IsmsScopeNarrative {
  const answers = data.wizardAnswers;
  const frameworks =
    data.frameworkNames.length > 0
      ? data.frameworkNames.join(', ')
      : 'the applicable information-security standards';

  // Wizard-confirmed certificate scope sentence wins over the generated default.
  const wizardSentence = answers.certificateScopeSentence?.trim();
  const certificateScopeSentence = normalizeSentence(
    wizardSentence && wizardSentence.length > 0
      ? wizardSentence
      : `The information security management system of ${data.organizationName} covers the people, processes and technology supporting the delivery and operation of its products and services, in accordance with ${frameworks}.`,
  );

  const inScope = deriveInScope(data);
  const interfaces = deriveInterfaces(data);
  const dependencies = deriveDependencies(data);

  return {
    certificateScopeSentence,
    inScope,
    interfaces,
    dependencies,
    exclusions: [],
    justification: undefined,
  };
}

/** In-scope description: prefer the wizard's confirmed live capabilities. */
function deriveInScope(data: IsmsPlatformData): string {
  const capabilities = data.wizardAnswers.capabilitiesInProduction ?? [];
  if (capabilities.length > 0) {
    return `The ISMS covers the delivery and operation of the following capabilities in production: ${capabilities.join(', ')}. All supporting information assets, personnel${data.memberCount > 0 ? ` (${data.memberCount} workforce members)` : ''}, systems and cloud infrastructure are within scope.`;
  }
  return `All information assets, personnel${data.memberCount > 0 ? ` (${data.memberCount} workforce members)` : ''}, systems and supporting cloud infrastructure used by ${data.organizationName} to deliver its services are within the ISMS scope.`;
}

/** Interfaces: include the provider-managed cloud layers named in the wizard. */
function deriveInterfaces(data: IsmsPlatformData): string[] {
  const interfaces: string[] = [];
  if (data.vendorCount > 0) {
    interfaces.push(
      `Third-party suppliers and service providers (${data.vendorCount}) that interface with organizational systems and data.`,
    );
  }
  for (const layer of data.wizardAnswers.cloudScopeSplit?.provider ?? []) {
    interfaces.push(`${layer} — managed by the cloud provider.`);
  }
  if (interfaces.length === 0) {
    interfaces.push('No external supplier interfaces are currently recorded.');
  }
  return interfaces;
}

/** Dependencies: infra vendors, sub-processors and customer-managed cloud layers. */
function deriveDependencies(data: IsmsPlatformData): string[] {
  const dependencies: string[] = [];
  for (const name of data.infraVendorNames) {
    dependencies.push(`${name} (cloud / infrastructure provider).`);
  }
  for (const name of data.subProcessorNames) {
    dependencies.push(`${name} (sub-processor).`);
  }
  for (const layer of data.wizardAnswers.cloudScopeSplit?.customer ?? []) {
    dependencies.push(`${layer} — managed by the organization.`);
  }
  if (dependencies.length === 0) {
    dependencies.push('No external dependencies are currently recorded.');
  }
  return dependencies;
}

function listToSection(heading: string, items: string[]): IsmsExportSection {
  return {
    heading,
    emptyText: 'None.',
    paragraphs: items.map((text) => ({ text })),
  };
}

export function buildScopeSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const parsed = ismsScopeNarrativeSchema.safeParse(input.narrative);
  if (!parsed.success) {
    return [{ heading: 'ISMS Scope', emptyText: 'No scope statement saved.' }];
  }
  const narrative = parsed.data;

  const sections: IsmsExportSection[] = [
    {
      heading: 'Scope statement',
      paragraphs: [
        { text: narrative.certificateScopeSentence },
        { label: 'In scope: ', text: narrative.inScope },
      ],
    },
    listToSection('Interfaces', narrative.interfaces),
    listToSection('Dependencies', narrative.dependencies),
    listToSection('Exclusions', narrative.exclusions),
  ];

  if (narrative.justification) {
    sections.push({
      heading: 'Justification for exclusions',
      paragraphs: [{ text: narrative.justification }],
    });
  }

  return sections;
}
