import { VendorCategory, VendorStatus } from '@db';
import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // Allow empty string in the input and treat it as "not provided"
  website: z
    .union([z.string().url('URL must be valid and start with https://'), z.literal('')])
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  description: z.string().optional(),
  category: z.nativeEnum(VendorCategory),
  status: z.nativeEnum(VendorStatus),
  assigneeId: z.string().optional(),
});

export type CreateVendorFormValues = z.infer<typeof createVendorSchema>;

