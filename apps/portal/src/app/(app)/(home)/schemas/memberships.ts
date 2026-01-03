import { z } from 'zod';

export const MembershipsResponseSchema = z.object({
  data: z.array(
    z.object({
      memberId: z.string(),
      role: z.string().optional(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }),
  ),
});

export type MembershipsResponse = z.infer<typeof MembershipsResponseSchema>;
