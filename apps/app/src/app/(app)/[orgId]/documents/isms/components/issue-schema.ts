import { z } from 'zod';

/**
 * Canonical zod schema for a Context-of-Organization issue (clause 4.1). Shared
 * by the add form (AddIssueForm) and the inline edit row (IssueRow) so both
 * validate identically against a single source of truth.
 */
export const issueSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  effect: z.string().min(1, 'Effect is required'),
});

export type IssueFormValues = z.infer<typeof issueSchema>;
