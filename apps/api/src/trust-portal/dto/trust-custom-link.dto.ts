import { z } from 'zod';

export const CreateCustomLinkSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url().max(2000),
});

export type CreateCustomLinkDto = z.infer<typeof CreateCustomLinkSchema>;

export const UpdateCustomLinkSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCustomLinkDto = z.infer<typeof UpdateCustomLinkSchema>;

export const ReorderCustomLinksSchema = z.object({
  linkIds: z.array(z.string()),
});

export type ReorderCustomLinksDto = z.infer<typeof ReorderCustomLinksSchema>;
