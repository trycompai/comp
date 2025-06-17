import { Departments, Frequency } from '@prisma/client'; // Assuming enums are available here
import { z } from 'zod';

export const CreatePolicySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  frequency: z.nativeEnum(Frequency),
  department: z.nativeEnum(Departments),
});

export type CreatePolicySchemaType = z.infer<typeof CreatePolicySchema>;
