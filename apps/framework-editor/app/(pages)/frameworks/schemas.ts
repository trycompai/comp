import { z } from 'zod';

export const FrameworkBaseSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  description: z.string().min(1, { message: 'Description is required.' }),
  version: z.string().min(1, { message: 'Version is required.' }),
  visible: z.boolean().optional(),
});

// FRAME-20: a framework family (folder). No version — it's an organisational
// unit, not a published artifact.
export const FrameworkFamilyBaseSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  description: z.string().optional(),
  status: z.enum(['visible', 'hidden', 'under_construction', 'partial']),
});

export const RequirementBaseSchema = z.object({
  name: z.string().min(1, { message: 'Requirement name is required.' }),
  description: z.string().optional(), // Assuming description can be optional
  identifier: z.string().optional(), // Identifier is optional
});
