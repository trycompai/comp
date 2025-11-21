'use server';

import { db } from '@/lib/db';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import 'server-only';

export const getQuestionnaires = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (
    !session?.session?.activeOrganizationId ||
    session.session.activeOrganizationId !== organizationId
  ) {
    return [];
  }

  const questionnaires = await db.questionnaire.findMany({
    where: {
      organizationId,
      status: {
        in: ['completed', 'parsing'],
      },
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
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return questionnaires;
};
