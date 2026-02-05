import { db } from '@db';
import 'server-only';

export const getQuestionnaireById = async (questionnaireId: string, organizationId: string) => {
  const questionnaire = await db.questionnaire.findUnique({
    where: {
      id: questionnaireId,
      organizationId,
    },
    include: {
      questions: {
        orderBy: {
          questionIndex: 'asc',
        },
        select: {
          id: true,
          question: true,
          answer: true,
          status: true,
          questionIndex: true,
          sources: true,
        },
      },
    },
  });

  if (!questionnaire) {
    return null;
  }

  return questionnaire;
};

