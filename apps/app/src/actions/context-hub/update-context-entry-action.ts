'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { updateContextEntrySchema } from '../schema';

export const updateContextEntryAction = authActionClient
  .inputSchema(updateContextEntrySchema)
  .metadata({ name: 'update-context-entry' })
  .action(async ({ parsedInput, ctx }) => {
    const { id, question, answer, tags } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;
    if (!organizationId) throw new Error('No active organization');

    await db.context.update({
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

    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');

    revalidatePath(path);

    return { success: true };
  });
