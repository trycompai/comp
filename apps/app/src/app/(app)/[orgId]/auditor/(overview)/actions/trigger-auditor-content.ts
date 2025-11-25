'use server';

import { authActionClient } from '@/actions/safe-action';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import { z } from 'zod';
import type { generateAuditorContentTask } from '@/jobs/tasks/auditor/generate-auditor-content';

export const triggerAuditorContentAction = authActionClient
  .inputSchema(
    z.object({
      orgId: z.string(),
    }),
  )
  .metadata({
    name: 'trigger-auditor-content',
    track: {
      event: 'trigger-auditor-content',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput }) => {
    const { orgId } = parsedInput;

    try {
      // Trigger the task
      const handle = await tasks.trigger<typeof generateAuditorContentTask>(
        'generate-auditor-content',
        {
          organizationId: orgId,
        },
      );

      // Create a public access token for the run
      const accessToken = await triggerAuth.createPublicToken({
        scopes: {
          read: {
            runs: [handle.id],
          },
        },
        expirationTime: '1h',
      });

      return {
        success: true,
        runId: handle.id,
        accessToken,
      };
    } catch (error) {
      console.error('Error triggering auditor content task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger task',
      };
    }
  });

