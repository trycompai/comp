import { db } from '@db';
import { logger } from '@/utils/logger';

type ProcessResult = {
  questionId: string;
  isApplicable: boolean | null;
  justification: string | null;
  success: boolean;
};

type Question = {
  id: string;
  text: string;
  columnMapping: {
    closure: string;
    title: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  };
};

export async function saveAnswersToDatabase(
  documentId: string,
  questions: Question[],
  results: ProcessResult[],
  userId: string,
): Promise<void> {
  const successfulResults = results.filter((r) => r.success && r.isApplicable !== null);

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
      const answerValue = result.isApplicable === false ? result.justification : null;

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

export async function updateConfigurationWithResults(
  configurationId: string,
  configurationQuestions: Question[],
  results: ProcessResult[],
): Promise<void> {
  const resultsMap = new Map(
    results.filter((r) => r.success && r.isApplicable !== null).map((r) => [r.questionId, r])
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
      questions: updatedQuestions,
    },
  });
}

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
      approverId: null, // Clear approver when answers are regenerated
      approvedAt: null, // Clear approval date when answers are regenerated
    },
  });
}

