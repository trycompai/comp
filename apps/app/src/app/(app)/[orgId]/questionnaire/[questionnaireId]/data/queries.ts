'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import 'server-only';

export const getQuestionnaireById = async (questionnaireId: string, organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return null;
  }

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

