'use server';

import { authActionClient } from '@/actions/safe-action';
import { vendorQuestionnaireOrchestratorTask } from '@/jobs/tasks/vendors/vendor-questionnaire-orchestrator';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';

const inputSchema = z.object({
  questionsAndAnswers: z.array(
    z.object({
      question: z.string(),
      answer: z.string().nullable(),
    }),
  ),
});

export const vendorQuestionnaireOrchestrator = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'vendor-questionnaire-orchestrator',
    track: {
      event: 'vendor-questionnaire-orchestrator',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionsAndAnswers } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const organizationId = session.activeOrganizationId;

    try {
      // Trigger the root orchestrator task - it will handle batching internally
      const handle = await tasks.trigger<typeof vendorQuestionnaireOrchestratorTask>(
        'vendor-questionnaire-orchestrator',
        {
          vendorId: `org_${organizationId}`,
          organizationId,
          questionsAndAnswers,
        },
      );

      return {
        success: true,
        data: {
          taskId: handle.id, // Return orchestrator task ID for polling
        },
      };
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to trigger vendor questionnaire orchestrator');
    }
  });

