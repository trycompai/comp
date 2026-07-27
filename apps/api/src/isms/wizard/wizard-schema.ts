import { z } from 'zod';

/**
 * The single source of truth for the IsmsProfile.answers JSON blob (CS-438).
 * These are the ~12 wizard answers that cannot be derived from platform data and
 * that feed ISMS document generation. Validated on every read and write.
 *
 * - `wizardAnswersSchema` validates the full, completed shape (used on complete).
 * - `partialWizardAnswersSchema` validates a partial save while the user steps
 *   through the wizard (every field optional, deeply).
 */

export const INTERNAL_AUDIT_APPROACHES = [
  'in_house',
  'external_firm',
  'training_planned',
] as const;

export const EU_REP_STATUSES = ['appointed', 'not_required', 'pending'] as const;

/**
 * Suggested sector-regulator options surfaced by the wizard. Customers may also
 * send a free-text value prefixed with `custom:` (e.g. `custom:My Regulator`).
 */
export const SECTOR_REGULATOR_OPTIONS = [
  'FINMA',
  'FCA',
  'HIPAA',
  'PCI DSS',
  'healthcare',
  'critical_infrastructure',
] as const;

const deputySpoSchema = z.object({
  memberId: z.string().nullable(),
  toBeNamed: z.boolean(),
});

const insuranceSchema = z.object({
  has: z.boolean(),
  insurerName: z.string(),
});

const cloudScopeSplitSchema = z.object({
  customer: z.array(z.string()),
  provider: z.array(z.string()),
});

const euRepSchema = z.object({
  status: z.enum(EU_REP_STATUSES),
  name: z.string(),
});

const objectiveSchema = z.object({
  objective: z.string(),
  target: z.string(),
});

/** The full, completed WizardAnswers shape (validated on complete=true). */
export const wizardAnswersSchema = z.object({
  deputySpo: deputySpoSchema,
  internalAuditApproach: z.enum(INTERNAL_AUDIT_APPROACHES).nullable(),
  certificationBody: z.string(),
  insurance: insuranceSchema,
  sectorRegulators: z.array(z.string()),
  hasContractors: z.boolean(),
  capabilitiesInProduction: z.array(z.string()),
  cloudScopeSplit: cloudScopeSplitSchema,
  euRep: euRepSchema,
  certificateScopeSentence: z.string(),
  objectives: z.array(objectiveSchema),
  intendedOutcomes: z.array(z.string()),
});

export type WizardAnswers = z.infer<typeof wizardAnswersSchema>;

/**
 * Deeply-partial variant for incremental saves. Nested objects/arrays are all
 * optional so the client can PATCH a single step's answers.
 */
export const partialWizardAnswersSchema = z.object({
  deputySpo: deputySpoSchema.partial().optional(),
  internalAuditApproach: z.enum(INTERNAL_AUDIT_APPROACHES).nullable().optional(),
  certificationBody: z.string().optional(),
  insurance: insuranceSchema.partial().optional(),
  sectorRegulators: z.array(z.string()).optional(),
  hasContractors: z.boolean().optional(),
  capabilitiesInProduction: z.array(z.string()).optional(),
  cloudScopeSplit: cloudScopeSplitSchema.partial().optional(),
  euRep: euRepSchema.partial().optional(),
  certificateScopeSentence: z.string().optional(),
  objectives: z.array(objectiveSchema).optional(),
  intendedOutcomes: z.array(z.string()).optional(),
});

export type PartialWizardAnswers = z.infer<typeof partialWizardAnswersSchema>;

/** The body schema for POST /v1/isms/profile. */
export const saveWizardProfileSchema = z.object({
  frameworkId: z.string().min(1),
  answers: partialWizardAnswersSchema,
  complete: z.boolean().optional(),
});

export type SaveWizardProfileInput = z.infer<typeof saveWizardProfileSchema>;

/**
 * Parse a stored answers blob (Prisma JSON) into a partial WizardAnswers. Unknown
 * shapes degrade to an empty object so a malformed row never breaks reads.
 */
export function parseStoredAnswers(value: unknown): PartialWizardAnswers {
  const parsed = partialWizardAnswersSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}
