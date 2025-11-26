'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import 'server-only';

const saveAnswerSchema = z.object({
  documentId: z.string(),
  questionId: z.string(),
  answer: z.string().nullable(),
  isApplicable: z.boolean().nullable().optional(),
  justification: z.string().nullable().optional(),
});

export const saveSOAAnswer = authActionClient
  .inputSchema(saveAnswerSchema)
  .metadata({
    name: 'save-soa-answer',
    track: {
      event: 'save-soa-answer',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentId, questionId, answer, isApplicable, justification } = parsedInput;
    const { session, user } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const organizationId = session.activeOrganizationId;
    const userId = user.id;

    try {
      // Verify document exists and belongs to organization
      const document = await db.sOADocument.findFirst({
        where: {
          id: documentId,
          organizationId,
        },
        include: {
          configuration: true,
        },
      });

      if (!document) {
        throw new Error('SOA document not found');
      }

      // Get existing answer to determine version
      const existingAnswer = await db.sOAAnswer.findFirst({
        where: {
          documentId,
          questionId,
          isLatestAnswer: true,
        },
        orderBy: {
          answerVersion: 'desc',
        },
      });

      const nextVersion = existingAnswer ? existingAnswer.answerVersion + 1 : 1;

      // Mark existing answer as not latest if it exists
      if (existingAnswer) {
        await db.sOAAnswer.update({
          where: { id: existingAnswer.id },
          data: { isLatestAnswer: false },
        });
      }

      // Determine answer value: if isApplicable is NO, use justification; otherwise use provided answer or null
      let finalAnswer: string | null = null;
      if (isApplicable !== undefined) {
        // If isApplicable is provided, use justification if NO, otherwise null
        finalAnswer = isApplicable === false ? (justification || answer || null) : null;
      } else {
        // Fallback to provided answer
        finalAnswer = answer || null;
      }

      // Create or update answer
      await db.sOAAnswer.create({
        data: {
          documentId,
          questionId,
          answer: finalAnswer,
          status: finalAnswer && finalAnswer.trim().length > 0 ? 'manual' : 'untouched',
          answerVersion: nextVersion,
          isLatestAnswer: true,
          createdBy: existingAnswer ? undefined : userId,
          updatedBy: userId,
        },
      });

      // Update configuration's question mapping if isApplicable or justification provided
      // This needs to happen before counting answered questions
      if (isApplicable !== undefined || justification !== undefined) {
        const configuration = document.configuration;
        const questions = configuration.questions as Array<{
          id: string;
          text: string;
          columnMapping: {
            closure: string;
            title: string;
            control_objective: string | null;
            isApplicable: boolean | null;
            justification: string | null;
          };
        }>;

        const updatedQuestions = questions.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              columnMapping: {
                ...q.columnMapping,
                isApplicable: isApplicable !== undefined ? isApplicable : q.columnMapping.isApplicable,
                justification: justification !== undefined ? justification : q.columnMapping.justification,
              },
            };
          }
          return q;
        });

        await db.sOAFrameworkConfiguration.update({
          where: { id: configuration.id },
          data: {
            questions: updatedQuestions,
          },
        });
      }

      // Update document answered questions count (count questions with isApplicable set in configuration)
      const updatedConfiguration = await db.sOAFrameworkConfiguration.findUnique({
        where: { id: document.configurationId },
      });
      
      let answeredCount = 0;
      if (updatedConfiguration) {
        const configQuestions = updatedConfiguration.questions as Array<{
          id: string;
          columnMapping: {
            isApplicable: boolean | null;
          };
        }>;
        answeredCount = configQuestions.filter(q => q.columnMapping.isApplicable !== null).length;
      }

      await db.sOADocument.update({
        where: { id: documentId },
        data: {
          answeredQuestions: answeredCount,
          status: answeredCount === document.totalQuestions ? 'completed' : 'in_progress',
          completedAt: answeredCount === document.totalQuestions ? new Date() : null,
          // Clear approval when answers are edited
          approverId: null,
          approvedAt: null,
        },
      });

      // Revalidate the page
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to save SOA answer');
    }
  });

