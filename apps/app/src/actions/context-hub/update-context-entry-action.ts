'use server';

import { db } from '@db';
import { authActionClient } from '../safe-action';
import { updateContextEntrySchema } from '../schema';

export const updateContextEntryAction = authActionClient
  .inputSchema(updateContextEntrySchema)
  .metadata({ name: 'update-context-entry' })
  .action(async ({ parsedInput, ctx }) => {
    const { id, question, answer, tags } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;
    if (!organizationId) throw new Error('No active organization');

    const updated = await db.context.update({
      where: { id, organizationId },
      data: {
        question,
        answer,
        tags: tags
          ? tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      },
    });

    return {
      success: true,
      entry: {
        id: updated.id,
        question: updated.question,
        answer: updated.answer,
      },
    };
  });
