'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const saveManualAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  questionnaireId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const saveManualAnswer = authActionClient
  .inputSchema(saveManualAnswerSchema)
  .metadata({
    name: 'save-manual-answer',
    track: {
      event: 'save-manual-answer',
      description: 'Save Manual Answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { question, answer, questionnaireId, tags } = parsedInput;
    const { activeOrganizationId, userId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      // Upsert manual answer (create or update if question already exists)
      await db.securityQuestionnaireManualAnswer.upsert({
        where: {
          organizationId_question: {
            organizationId: activeOrganizationId,
            question: question.trim(),
          },
        },
        create: {
          question: question.trim(),
          answer: answer.trim(),
          tags: tags || [],
          organizationId: activeOrganizationId,
          sourceQuestionnaireId: questionnaireId || null,
          createdBy: userId || null,
          updatedBy: userId || null,
        },
        update: {
          answer: answer.trim(),
          tags: tags || [],
          sourceQuestionnaireId: questionnaireId || null,
          updatedBy: userId || null,
          updatedAt: new Date(),
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      // Also revalidate knowledge base page
      revalidatePath(`/${activeOrganizationId}/knowledge-base`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error saving manual answer:', error);
      return {
        success: false,
        error: 'Failed to save manual answer',
      };
    }
  });

