'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getGT } from 'gt-next/server';
import { authActionClient } from '../safe-action';
import { getUpdateContextEntrySchema } from '../schema';

export const updateContextEntryAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getUpdateContextEntrySchema(t);
  })
  .metadata({ name: 'update-context-entry' })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const { id, question, answer, tags } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;
    if (!organizationId) throw new Error(t('No active organization'));

    await db.context.update({
      where: { id, organizationId },
      data: {
        question,
        answer,
        tags: tags
          ? tags
              .split(',')
              .map((tag) => tag.trim())
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
