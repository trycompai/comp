'use server';

import { authActionClient } from '@/actions/safe-action';
import { backfillTrainingVideosForAllOrgs } from '@/jobs/tasks/onboarding/backfill-training-videos-for-all-orgs';
import { backfillTrainingVideosForOrg } from '@/jobs/tasks/onboarding/backfill-training-videos-for-org';
import { db } from '@db';
import { z } from 'zod';
import type { ActionResponse } from '../types';

const triggerBackfillSchema = z.object({
  organizationId: z.string().optional(),
});

export const triggerTrainingVideoBackfill = authActionClient
  .metadata({
    name: 'trigger-training-video-backfill',
    track: {
      event: 'trigger_training_video_backfill',
      channel: 'admin',
    },
  })
  .inputSchema(triggerBackfillSchema)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<
      ActionResponse<{
        triggered: boolean;
        jobType: 'single-org' | 'all-orgs';
        organizationId?: string;
      }>
    > => {
      try {
        // Check if user has admin permissions (you may want to add additional checks)
        const member = await db.member.findFirst({
          where: {
            userId: ctx.user.id,
            organizationId: ctx.session.activeOrganizationId,
          },
        });

        if (!member || (!member.role.includes('admin') && !member.role.includes('owner'))) {
          return {
            success: false,
            error: 'Insufficient permissions. Admin or owner role required.',
          };
        }

        if (parsedInput.organizationId) {
          // Trigger backfill for a specific organization
          await backfillTrainingVideosForOrg.trigger({
            organizationId: parsedInput.organizationId,
          });

          return {
            success: true,
            data: {
              triggered: true,
              jobType: 'single-org',
              organizationId: parsedInput.organizationId,
            },
          };
        } else {
          // Trigger backfill for all organizations
          await backfillTrainingVideosForAllOrgs.trigger();

          return {
            success: true,
            data: {
              triggered: true,
              jobType: 'all-orgs',
            },
          };
        }
      } catch (error) {
        console.error('Error triggering training video backfill:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to trigger backfill job';
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  );
