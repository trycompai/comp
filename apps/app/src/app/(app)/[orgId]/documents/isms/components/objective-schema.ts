import { z } from 'zod';
import { OBJECTIVE_STATUSES } from './objectives-status';

/**
 * Canonical zod schema for an information security objective (clause 6.2). Shared
 * by the add form (ObjectivesForm) and the inline edit row (ObjectivesRow) so
 * both validate identically against a single source of truth.
 */
export const objectiveSchema = z.object({
  objective: z.string().min(1, 'Objective is required'),
  target: z.string(),
  ownerMemberId: z.string(),
  cadence: z.string(),
  plan: z.string(),
  measurementMethod: z.string(),
  status: z.enum(OBJECTIVE_STATUSES),
});

export type ObjectiveFormValues = z.infer<typeof objectiveSchema>;
