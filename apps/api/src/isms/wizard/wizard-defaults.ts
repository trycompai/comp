import { db } from '@db';
import { collectPlatformData } from '../documents/data-source';
import { deriveScopeNarrative } from '../documents/scope';
import { deriveObjectives } from '../documents/objectives';
import { SECTOR_REGULATOR_OPTIONS } from './wizard-schema';

/** The Context Q&A question key that stores the org's services description. */
const SERVICES_CONTEXT_QUESTION = 'Types of Services Provided';

/** Default intended ISMS outcomes (5.x) offered for confirmation. */
export const DEFAULT_INTENDED_OUTCOMES: string[] = [
  'Protect the confidentiality, integrity and availability of information assets.',
  'Meet applicable legal, regulatory and contractual information-security obligations.',
  'Maintain customer and stakeholder trust through demonstrable security practices.',
  'Identify, assess and treat information-security risks within defined tolerances.',
  'Continually improve the effectiveness of the information security management system.',
];

/** Default cloud scope split between customer- and provider-managed layers (4.3). */
export const DEFAULT_CLOUD_SCOPE_SPLIT: {
  customer: string[];
  provider: string[];
} = {
  customer: ['Data', 'Databases', 'Application configuration'],
  provider: ['Underlying infrastructure'],
};

/** The shape returned by GET /v1/isms/profile under `defaults`. */
export interface WizardDefaults {
  capabilitiesInProduction: string[];
  certificateScopeSentence: string;
  objectives: Array<{ objective: string; target: string }>;
  intendedOutcomes: string[];
  cloudScopeSplit: { customer: string[]; provider: string[] };
  sectorRegulatorOptions: string[];
}

/**
 * Compute the pre-population defaults for the wizard. Sourced from the same
 * platform-data + derivation logic that drives document generation, so the
 * confirmed-default flow stays consistent with what generation would produce.
 */
export async function computeWizardDefaults({
  organizationId,
  frameworkId,
}: {
  organizationId: string;
  frameworkId: string;
}): Promise<WizardDefaults> {
  const [data, capabilitiesInProduction] = await Promise.all([
    collectPlatformData({ organizationId, frameworkId }),
    loadServicesFromContext({ organizationId }),
  ]);

  const scope = deriveScopeNarrative(data);
  const objectives = deriveObjectives(data).map((row) => ({
    objective: row.objective,
    target: row.target ?? '',
  }));

  return {
    capabilitiesInProduction,
    certificateScopeSentence: scope.certificateScopeSentence,
    objectives,
    intendedOutcomes: DEFAULT_INTENDED_OUTCOMES,
    cloudScopeSplit: DEFAULT_CLOUD_SCOPE_SPLIT,
    sectorRegulatorOptions: [...SECTOR_REGULATOR_OPTIONS],
  };
}

/**
 * Read the org's "Types of Services Provided" Context answer and split it into a
 * list of candidate capabilities. The answer is free text, so we split on lines /
 * bullets / common separators and drop empties. Returns [] when absent.
 */
async function loadServicesFromContext({
  organizationId,
}: {
  organizationId: string;
}): Promise<string[]> {
  const entry = await db.context.findFirst({
    where: { organizationId, question: SERVICES_CONTEXT_QUESTION },
    select: { answer: true },
  });
  if (!entry?.answer) return [];

  return entry.answer
    .split(/\r?\n|[•·;]/)
    .map((item) => item.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((item) => item.length > 0);
}
