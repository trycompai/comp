import { z } from 'zod';

/**
 * Canonical zod schema for an interested party (clause 4.2a). Shared by the add
 * form (InterestedPartiesForm) and the inline edit row (InterestedPartiesRow) so
 * both validate identically against a single source of truth.
 */
export const interestedPartySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  needsExpectations: z.string().trim().min(1, 'Needs & expectations are required'),
});

export type InterestedPartyFormValues = z.infer<typeof interestedPartySchema>;
