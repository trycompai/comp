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

      // Store justification in answer field only if isApplicable is NO
      const answerValue =
        result.isApplicable === false ? result.justification : null;

      // Create new answer
      await db.sOAAnswer.create({
        data: {
          documentId,
          questionId: question.id,
          answer: answerValue,
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
 * Updates SOA configuration with auto-fill results
 */
export async function updateConfigurationWithResults(
  configurationId: string,
  configurationQuestions: SOAQuestion[],
  results: SOAQuestionResult[],
): Promise<void> {
  const resultsMap = new Map(
    results
      .filter((r) => r.success && r.isApplicable !== null)
      .map((r) => [r.questionId, r]),
  );

  const updatedQuestions = configurationQuestions.map((q) => {
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

  await db.sOAFrameworkConfiguration.update({
    where: { id: configurationId },
    data: {
      questions: JSON.parse(JSON.stringify(updatedQuestions)),
    },
  });
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
    },
  });
}

/**
 * Gets the answered questions count from configuration
 */
export async function getAnsweredCountFromConfiguration(
  configurationId: string,
): Promise<number> {
  const configuration = await db.sOAFrameworkConfiguration.findUnique({
    where: { id: configurationId },
  });

  if (!configuration) return 0;

  const questions = configuration.questions as Array<{
    id: string;
    columnMapping: {
      isApplicable: boolean | null;
    };
  }>;

  return questions.filter((q) => q.columnMapping.isApplicable !== null).length;
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
