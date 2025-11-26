'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { z } from 'zod';

export const saveAuditorContentAction = authActionClient
  .inputSchema(
    z.object({
      orgId: z.string(),
      question: z.string(), // The Context question (e.g., "Company Background & Overview of Operations")
      content: z.string(),
    }),
  )
  .metadata({
    name: 'save-auditor-content',
    track: {
      event: 'save-auditor-content',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput }) => {
    const { orgId, question, content } = parsedInput;

    // Find existing context entry
    const existingContext = await db.context.findFirst({
      where: {
        organizationId: orgId,
        question,
      },
    });

    if (existingContext) {
      // Update existing entry
      await db.context.update({
        where: { id: existingContext.id },
        data: {
          answer: content,
          tags: ['auditor'],
        },
      });
    } else {
      // Create new entry
      await db.context.create({
        data: {
          organizationId: orgId,
          question,
          answer: content,
          tags: ['auditor'],
        },
      });
    }

    return {
      success: true,
    };
  });
