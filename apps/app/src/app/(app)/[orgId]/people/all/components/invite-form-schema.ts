import type { Role } from '@db';
import { z } from 'zod';

export const ALL_SELECTABLE_ROLES: Role[] = ['admin', 'auditor', 'employee', 'contractor'];

export const manualInviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  roles: z.array(z.string()).min(1, { message: 'Please select at least one role.' }),
});

export const formSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('manual'),
    manualInvites: z
      .array(manualInviteSchema)
      .min(1, { message: 'Please add at least one invite.' }),
    csvFile: z.any().optional(),
  }),
  z.object({
    mode: z.literal('csv'),
    manualInvites: z.array(manualInviteSchema).optional(),
    csvFile: z.any().refine((val) => val instanceof FileList && val.length === 1, {
      message: 'Please select a single CSV file.',
    }),
  }),
]);

export type InviteFormData = z.infer<typeof formSchema>;

export interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}
