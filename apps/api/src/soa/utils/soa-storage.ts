import { db } from '@db';
import type { SOAQuestion, SOAQuestionResult } from './soa-answer-parser';

export interface SOAStorageLogger {
  log: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

const defaultLogger: SOAStorageLogger = {
  log: () => {},
  error: () => {},
};

/**
 * Saves auto-generated SOA answers to the database
 */
export async function saveAnswersToDatabase(
  documentId: string,
  questions: SOAQuestion[],
  results: SOAQuestionResult[],
  userId: string,
  logger: SOAStorageLogger = defaultLogger,
): Promise<void> {
  const successfulResults = results.filter(
    (r) => r.success && r.isApplicable !== null,
  );

  for (const result of successfulResults) {
    const question = questions.find((q) => q.id === result.questionId);
    if (!question) continue;

    try {
      // Get existing answer to determine version
      const existingAnswer = await db.sOAAnswer.findFirst({
        where: {
          documentId,
          questionId: question.id,
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

      // Store justification in the answer field for both YES and NO so the
      // SoA always carries a justification for every control (per ISO 27001).
      const answerValue = result.justification ?? null;

      // Create new answer. Applicability + justification are stored per
      // organization on the answer — never on the shared configuration.
      await db.sOAAnswer.create({
        data: {
          documentId,
          questionId: question.id,
          answer: answerValue,
          isApplicable: result.isApplicable,
          status: 'generated',
          generatedAt: new Date(),
          answerVersion: nextVersion,
          isLatestAnswer: true,
          createdBy: userId,
        },
      });
    } catch (error) {
      logger.error('Failed to save SOA answer', {
        questionId: question.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Updates SOA document status after auto-fill
 */
export async function updateDocumentAfterAutoFill(
  documentId: string,
  totalQuestions: number,
  answeredCount: number,
): Promise<void> {
  await db.sOADocument.update({
    where: { id: documentId },
    data: {
      answeredQuestions: answeredCount,
      status: answeredCount === totalQuestions ? 'completed' : 'in_progress',
      completedAt: answeredCount === totalQuestions ? new Date() : null,
      approverId: null,
      approvedAt: null,
      declinedAt: null,
    },
  });
}

/**
 * Counts answered questions for a document from its per-organization answers.
 * A control is "answered" once it has an applicability decision. Scoped to the
 * question IDs in the document's active configuration so stale/mismatched
 * answer rows can't skew the completion count.
 */
export async function countAnsweredAnswers(
  documentId: string,
  validQuestionIds: string[],
): Promise<number> {
  if (validQuestionIds.length === 0) {
    return 0;
  }

  return db.sOAAnswer.count({
    where: {
      documentId,
      isLatestAnswer: true,
      isApplicable: { not: null },
      questionId: { in: validQuestionIds },
    },
  });
}

/**
 * Updates document answered count and status
 */
export async function updateDocumentAnsweredCount(
  documentId: string,
  totalQuestions: number,
  answeredCount: number,
): Promise<void> {
  await db.sOADocument.update({
    where: { id: documentId },
    data: {
      answeredQuestions: answeredCount,
      status: answeredCount === totalQuestions ? 'completed' : 'in_progress',
      completedAt: answeredCount === totalQuestions ? new Date() : null,
      // Clear approval when answers are edited
      approverId: null,
      approvedAt: null,
      declinedAt: null,
    },
  });
}

/**
 * Checks if organization is fully remote based on context
 */
export async function checkIfFullyRemote(
  organizationId: string,
  logger: SOAStorageLogger = defaultLogger,
): Promise<boolean> {
  try {
    const teamWorkContext = await db.context.findFirst({
      where: {
        organizationId,
        question: {
          contains: 'How does your team work',
          mode: 'insensitive',
        },
      },
    });

    logger.log('Team work context check for SOA auto-fill', {
      organizationId,
      found: !!teamWorkContext,
    });

    if (teamWorkContext?.answer) {
      const answerLower = teamWorkContext.answer.toLowerCase();
      return (
        answerLower.includes('fully remote') ||
        answerLower.includes('fully-remote')
      );
    }
    return false;
  } catch (error) {
    logger.error('Failed to check team work mode for SOA', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}
