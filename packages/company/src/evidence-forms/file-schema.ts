import { z } from 'zod';

export const evidenceFormFileSchema = z.object({
  fileName: z.string().min(1),
  fileKey: z.string().min(1),
  downloadUrl: z.string().url(),
});

export type EvidenceFormFile = z.infer<typeof evidenceFormFileSchema>;
