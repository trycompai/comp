'use server';

import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { getCreateContextEntrySchema } from '../schema';

export const createContextEntryAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getCreateContextEntrySchema(t);
  })
  .metadata({ name: 'create-context-entry' })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const { question, answer, tags } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;
    if (!organizationId) throw new Error(t('No active organization'));

    await db.context.create({
      data: {
        question,
        answer,
        tags: tags
          ? tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        organizationId,
      },
    });

    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');

    revalidatePath(path);

    return { success: true };
  });
