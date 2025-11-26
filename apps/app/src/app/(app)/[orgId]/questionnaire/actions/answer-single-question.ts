'use server';

import { authActionClient } from '@/actions/safe-action';
import { answerQuestion } from '@/jobs/tasks/vendors/answer-question';
import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

const inputSchema = z.object({
  question: z.string(),
  questionIndex: z.number(),
  totalQuestions: z.number(),
});

export const answerSingleQuestionAction = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'answer-single-question',
    track: {
      event: 'answer-single-question',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { question, questionIndex, totalQuestions } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const organizationId = session.activeOrganizationId;

    try {
      // Call answerQuestion function directly
      const result = await answerQuestion(
        {
          question,
          organizationId,
          questionIndex,
          totalQuestions,
        },
        {
          useMetadata: false,
        },
      );

      // Revalidate the page to show updated answer
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: result.success,
        data: {
          questionIndex: result.questionIndex,
          question: result.question,
          answer: result.answer,
          sources: result.sources,
          error: result.error,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to answer question',
      };
    }
  });

