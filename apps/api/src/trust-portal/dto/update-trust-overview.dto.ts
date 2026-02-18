import { z } from 'zod';

export const UpdateTrustOverviewSchema = z.object({
  overviewTitle: z.string().max(200).optional().nullable(),
  overviewContent: z.string().max(10000).optional().nullable(),
  showOverview: z.boolean().optional(),
});

export type UpdateTrustOverviewDto = z.infer<typeof UpdateTrustOverviewSchema>;
