'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { z } from 'zod';
import 'server-only';

const createSOADocumentSchema = z.object({
  frameworkId: z.string(),
  organizationId: z.string(),
});

export const createSOADocument = authActionClient
  .inputSchema(createSOADocumentSchema)
  .metadata({
    name: 'create-soa-document',
    track: {
      event: 'create-soa-document',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { frameworkId, organizationId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId || session.activeOrganizationId !== organizationId) {
      throw new Error('Unauthorized');
    }

    // Get the latest SOA configuration for this framework
    const configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId,
        isLatest: true,
      },
    });

    if (!configuration) {
      throw new Error('No SOA configuration found for this framework');
    }

    // Check if there's already a latest document for this framework and organization
    const existingLatestDocument = await db.sOADocument.findFirst({
      where: {
        frameworkId,
        organizationId,
        isLatest: true,
      },
    });

    // Determine the next version number
    let nextVersion = 1;
    if (existingLatestDocument) {
      // Mark existing document as not latest
      await db.sOADocument.update({
        where: { id: existingLatestDocument.id },
        data: { isLatest: false },
      });
      nextVersion = existingLatestDocument.version + 1;
    }

    // Get questions from configuration to calculate totalQuestions
    const questions = configuration.questions as Array<{ id: string }>;
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;

    // Create new SOA document
    const document = await db.sOADocument.create({
      data: {
        frameworkId,
        organizationId,
        configurationId: configuration.id,
        version: nextVersion,
        isLatest: true,
        status: 'draft',
        totalQuestions,
        answeredQuestions: 0,
      },
      include: {
        framework: true,
        configuration: true,
      },
    });

    return {
      success: true,
      data: document,
    };
  });

