'use server';

import { db } from '@db';
import { seedISO27001SOAConfig } from './seed-soa-config';
import 'server-only';

/**
 * Direct server function to create SOA document without revalidation
 * Used during page render, so cannot use server actions with revalidatePath
 */
async function createSOADocumentDirect(frameworkId: string, organizationId: string, configurationId: string) {
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
  const configuration = await db.sOAFrameworkConfiguration.findUnique({
    where: { id: configurationId },
  });

  if (!configuration) {
    throw new Error('Configuration not found');
  }

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
      answers: {
        where: {
          isLatestAnswer: true,
        },
      },
    },
  });

  return document;
}

/**
 * Ensures SOA configuration and document exist for a framework
 * Currently only supports ISO 27001
 */
export async function ensureSOASetup(frameworkId: string, organizationId: string) {
  // Get framework to check if it's ISO
  const framework = await db.frameworkEditorFramework.findUnique({
    where: { id: frameworkId },
  });

  if (!framework) {
    throw new Error('Framework not found');
  }

  // Check if framework is ISO 27001 (currently only supported framework)
  const isISO27001 = ['ISO 27001', 'iso27001', 'ISO27001'].includes(framework.name);

  if (!isISO27001) {
    return {
      success: false,
      error: 'Only ISO 27001 framework is currently supported',
      configuration: null,
      document: null,
    };
  }

  // Check if configuration exists
  let configuration = await db.sOAFrameworkConfiguration.findFirst({
    where: {
      frameworkId,
      isLatest: true,
    },
  });

  // Create configuration if it doesn't exist
  if (!configuration) {
    try {
      configuration = await seedISO27001SOAConfig();
    } catch (error) {
      throw new Error(`Failed to create SOA configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if document exists
  let document = await db.sOADocument.findFirst({
    where: {
      frameworkId,
      organizationId,
      isLatest: true,
    },
    include: {
      answers: {
        where: {
          isLatestAnswer: true,
        },
      },
    },
  });

  // Create document if it doesn't exist (using direct function to avoid revalidation during render)
  if (!document && configuration) {
    try {
      document = await createSOADocumentDirect(frameworkId, organizationId, configuration.id);
    } catch (error) {
      throw new Error(`Failed to create SOA document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: true,
    configuration,
    document,
  };
}

