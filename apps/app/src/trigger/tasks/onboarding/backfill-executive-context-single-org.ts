import { db } from '@db';
import { logger, queue, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';

const CSUITE_QUESTION = 'Who are your C-Suite executives?';
const SIGNATORY_QUESTION = 'Who will sign off on the final report?';

const backfillQueue = queue({
  name: 'backfill-executive-context-single-org',
  concurrencyLimit: 10,
});

export const backfillExecutiveContextSingleOrg = schemaTask({
  id: 'backfill-executive-context-single-org',
  queue: backfillQueue,
  schema: z.object({
    organizationId: z.string(),
  }),
  run: async ({ organizationId }) => {
    logger.info(`Backfilling executive context for organization ${organizationId}`);

    // Check if the org already has these context entries
    const existingContext = await db.context.findMany({
      where: {
        organizationId,
        question: {
          in: [CSUITE_QUESTION, SIGNATORY_QUESTION],
        },
      },
      select: {
        question: true,
      },
    });

    const existingQuestions = new Set(existingContext.map((c) => c.question));

    const toCreate: {
      question: string;
      answer: string;
      organizationId: string;
      tags: string[];
    }[] = [];

    // Check if cSuite is missing
    if (!existingQuestions.has(CSUITE_QUESTION)) {
      toCreate.push({
        question: CSUITE_QUESTION,
        answer: JSON.stringify([{ name: 'TBD', title: 'CEO' }]),
        organizationId,
        tags: ['onboarding'],
      });
    }

    // Check if signatory is missing
    if (!existingQuestions.has(SIGNATORY_QUESTION)) {
      toCreate.push({
        question: SIGNATORY_QUESTION,
        answer: JSON.stringify({
          fullName: 'TBD',
          jobTitle: 'CEO',
          email: 'tbd@company.com',
        }),
        organizationId,
        tags: ['onboarding'],
      });
    }

    if (toCreate.length > 0) {
      await db.context.createMany({ data: toCreate });
      logger.info(`Created ${toCreate.length} context entries for org ${organizationId}`);
      return {
        success: true,
        entriesCreated: toCreate.length,
      };
    }

    logger.info(`Organization ${organizationId} already has all executive context entries`);
    return {
      success: true,
      entriesCreated: 0,
    };
  },
});
