import { z } from 'zod';

/**
 * Canonical zod schema for an ISMS governance role's editable text fields
 * (clause 5.3). Shared by the add-custom-role form and the inline edit row so
 * both validate identically. The Internal Auditor route and member assignments
 * are managed separately (they are their own records / API calls).
 */
export const roleSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required'),
  description: z.string(),
  responsibilities: z.string(),
  authorities: z.string(),
  authorityGrantedBy: z.string(),
  requiredCompetence: z.string(),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
