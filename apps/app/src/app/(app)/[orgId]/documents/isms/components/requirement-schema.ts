import { z } from 'zod';

/**
 * Canonical zod schema for an interested-party requirement (clauses 4.2b/c).
 * Shared by the add form (RequirementsForm) and the inline edit row
 * (RequirementsRow) so both validate identically against a single source of
 * truth.
 */
export const requirementSchema = z.object({
  partyName: z.string().min(1, 'Interested party is required'),
  interestedPartyId: z.string().optional(),
  requirement: z.string().min(1, 'Requirement is required'),
  treatment: z.string().min(1, 'ISMS treatment is required'),
});

export type RequirementFormValues = z.infer<typeof requirementSchema>;
