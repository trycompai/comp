'use server';

import { authActionClient } from '@/actions/safe-action';
import { syncOrganizationEmbeddings } from '@/lib/vector';
import { db } from '@db';
import { logger } from '@/utils/logger';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateSOAAnswerWithRAG } from '../utils/generate-soa-answer';
import 'server-only';

const inputSchema = z.object({
  documentId: z.string(),
});

export const autoFillSOA = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'auto-fill-soa',
    track: {
      event: 'auto-fill-soa',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentId } = parsedInput;
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
      // Fetch SOA document with configuration
      const document = await db.sOADocument.findFirst({
        where: {
          id: documentId,
          organizationId,
        },
        include: {
          framework: true,
          configuration: true,
          answers: {
            where: {
              isLatestAnswer: true,
            },
          },
        },
      });

      if (!document) {
        throw new Error('SOA document not found');
      }

      const configuration = document.configuration;
      const questions = configuration.questions as Array<{
        id: string;
        text: string;
        columnMapping: {
          title: string;
          control_objective: string | null;
          isApplicable: boolean | null;
        };
      }>;

      // Process ALL questions - determine applicability for all
      // If isApplicable is already set, we can still regenerate if needed
      // For now, process all questions to ensure completeness
      const questionsToAnswer = questions;

      logger.info('Starting auto-fill SOA', {
        organizationId,
        documentId,
        totalQuestions: questions.length,
        questionsToAnswer: questionsToAnswer.length,
      });

      // Sync organization embeddings before generating answers
      try {
        await syncOrganizationEmbeddings(organizationId);
        logger.info('Organization embeddings synced successfully', {
          organizationId,
        });
      } catch (error) {
        logger.warn('Failed to sync organization embeddings', {
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with existing embeddings if sync fails
      }

      // Process questions in batches to avoid overwhelming the system
      // Process all questions to determine applicability
      const batchSize = 10;
      const results: Array<{
        questionId: string;
        isApplicable: boolean | null;
        justification: string | null;
        sources: unknown;
        success: boolean;
        error: string | null;
      }> = [];

      for (let i = 0; i < questionsToAnswer.length; i += batchSize) {
        const batch = questionsToAnswer.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map((question, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            // First, determine if the control is applicable based on organization's context
            const applicabilityQuestion = `Based on our organization's policies, documentation, business context, and operations, is the control "${question.columnMapping.title}" (${question.text}) applicable to our organization? 

Consider:
- Our business type and industry
- Our operational scope and scale
- Our risk profile
- Our regulatory requirements
- Our technical infrastructure

Respond with ONLY "YES" or "NO" - no additional explanation.`;

            return generateSOAAnswerWithRAG(
              applicabilityQuestion,
              organizationId,
            ).then(async (applicabilityResult) => {
              if (!applicabilityResult.answer) {
                return {
                  questionId: question.id,
                  isApplicable: null,
                  justification: null,
                  sources: applicabilityResult.sources,
                  success: false,
                  error: 'Failed to determine applicability - no answer generated',
                };
              }

              // Parse YES/NO from answer
              const answerText = applicabilityResult.answer.trim().toUpperCase();
              const isApplicable = answerText.includes('YES') || answerText.includes('APPLICABLE');
              const isNotApplicable = answerText.includes('NO') || answerText.includes('NOT APPLICABLE') || answerText.includes('NOT APPLICABLE');

              let finalIsApplicable: boolean | null = null;
              if (isApplicable && !isNotApplicable) {
                finalIsApplicable = true;
              } else if (isNotApplicable && !isApplicable) {
                finalIsApplicable = false;
              }

              // If not applicable, generate justification
              let justification: string | null = null;
              if (finalIsApplicable === false) {
                const justificationQuestion = `Why is the control "${question.columnMapping.title}" not applicable to our organization? 

Provide a clear, professional justification explaining:
- Why this control does not apply to our business context
- Our operational characteristics that make it irrelevant
- Our risk profile considerations
- Any other relevant factors

Keep the justification concise (2-3 sentences).`;

                const justificationResult = await generateSOAAnswerWithRAG(
                  justificationQuestion,
                  organizationId,
                );

                if (justificationResult.answer) {
                  justification = justificationResult.answer;
                }
              }

              return {
                questionId: question.id,
                isApplicable: finalIsApplicable,
                justification,
                sources: applicabilityResult.sources,
                success: true,
                error: null,
              };
            });
          }),
        );

        results.push(...batchResults);
      }

      // Save answers to database
      const answersToSave = results
        .filter((r) => r.success && r.isApplicable !== null)
        .map((result) => {
          const question = questionsToAnswer.find((q) => q.id === result.questionId);
          if (!question) return null;

          // Get existing answer to determine version
          return db.sOAAnswer.findFirst({
            where: {
              documentId,
              questionId: question.id,
              isLatestAnswer: true,
            },
            orderBy: {
              answerVersion: 'desc',
            },
          }).then(async (existingAnswer: { id: string; answerVersion: number } | null) => {
            const nextVersion = existingAnswer ? existingAnswer.answerVersion + 1 : 1;

            // Mark existing answer as not latest if it exists
            if (existingAnswer) {
              await db.sOAAnswer.update({
                where: { id: existingAnswer.id },
                data: { isLatestAnswer: false },
              });
            }

            // Store justification in answer field if not applicable
            // If applicable, answer is null (we don't need justification)
            const answerValue = result.isApplicable === false ? result.justification : null;

            // Create new answer with justification (if not applicable)
            const newAnswer = await db.sOAAnswer.create({
              data: {
                documentId,
                questionId: question.id,
                answer: answerValue, // Store justification here if not applicable
                status: 'generated',
                sources: result.sources || undefined,
                generatedAt: new Date(),
                answerVersion: nextVersion,
                isLatestAnswer: true,
                createdBy: userId,
              },
            });

            return newAnswer;
          });
        })
        .filter((promise) => promise !== null);

      await Promise.all(answersToSave);

      // Update the configuration's question mapping with all generated isApplicable values
      const configQuestions = configuration.questions as Array<{
        id: string;
        text: string;
        columnMapping: {
          title: string;
          control_objective: string | null;
          isApplicable: boolean | null;
          justification: string | null;
        };
      }>;

      // Create a map of results for easy lookup
      const resultsMap = new Map(
        results
          .filter((r) => r.success && r.isApplicable !== null)
          .map((r) => [r.questionId, r])
      );

      // Update all questions in the configuration
      const updatedQuestions = configQuestions.map((q) => {
        const result = resultsMap.get(q.id);
        if (result) {
          return {
            ...q,
            columnMapping: {
              ...q.columnMapping,
              isApplicable: result.isApplicable,
              justification: result.justification,
            },
          };
        }
        return q;
      });

      // Update configuration with new isApplicable values
      await db.sOAFrameworkConfiguration.update({
        where: { id: configuration.id },
        data: {
          questions: updatedQuestions,
        },
      });

      // Update document answered questions count
      // Count questions that have isApplicable determined (not null)
      const answeredCount = results.filter((r) => r.success && r.isApplicable !== null).length;

      await db.sOADocument.update({
        where: { id: documentId },
        data: {
          answeredQuestions: answeredCount,
          status: answeredCount === document.totalQuestions ? 'completed' : 'in_progress',
          completedAt: answeredCount === document.totalQuestions ? new Date() : null,
        },
      });

      // Revalidate the page
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
        data: {
          answered: results.filter((r) => r.success).length,
          total: questionsToAnswer.length,
        },
      };
    } catch (error) {
      logger.error('Failed to auto-fill SOA', {
        organizationId,
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error ? error : new Error('Failed to auto-fill SOA');
    }
  });

