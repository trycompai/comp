'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import 'server-only';

export const getPublishedPolicies = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const policies = await db.policy.findMany({
    where: {
      organizationId,
      status: 'published',
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return policies;
};

export const getContextEntries = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const contextEntries = await db.context.findMany({
    where: {
      organizationId,
      answer: {
        not: '',
      },
    },
    select: {
      id: true,
      question: true,
      answer: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return contextEntries;
};

export const getKnowledgeBaseDocuments = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const documents = await db.knowledgeBaseDocument.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      s3Key: true,
      fileType: true,
      fileSize: true,
      processingStatus: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return documents;
};

export const getManualAnswers = async (organizationId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session?.activeOrganizationId || session.session.activeOrganizationId !== organizationId) {
    return [];
  }

  const manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      question: true,
      answer: true,
      tags: true,
      sourceQuestionnaireId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return manualAnswers;
};

