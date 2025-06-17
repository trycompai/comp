import { z } from 'zod';

export const createControlTemplateSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
});
