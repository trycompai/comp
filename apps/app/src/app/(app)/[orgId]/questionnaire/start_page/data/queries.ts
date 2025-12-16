'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import 'server-only';

export const getQuestionnaires = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const questionnaires = await db.questionnaire.findMany({
    where: {
      organizationId,
      status: {
        in: ['completed', 'parsing'],
      },
    },
    select: {
      id: true,
      filename: true,
      fileType: true,
      status: true,
      totalQuestions: true,
      answeredQuestions: true,
      source: true,
      createdAt: true,
      updatedAt: true,
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
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return questionnaires;
};

