'use server';

import { authActionClient } from '@/actions/safe-action';
import { autoAnswerQuestionnaireTask } from '@/jobs/tasks/vendors/auto-answer-questionnaire';
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

export const autoAnswerQuestionnaire = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'auto-answer-questionnaire',
    track: {
      event: 'auto-answer-questionnaire',
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
      const handle = await tasks.trigger<typeof autoAnswerQuestionnaireTask>(
        'auto-answer-questionnaire',
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
        : new Error('Failed to trigger auto-answer questionnaire');
    }
  });

