'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { authActionClient } from '../safe-action';
import { deleteContextEntrySchema } from '../schema';

export const deleteContextEntryAction = authActionClient
  .inputSchema(deleteContextEntrySchema)
  .metadata({ name: 'delete-context-entry' })
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;
    if (!organizationId) throw new Error('No active organization');

    await db.context.delete({
      where: { id, organizationId },
    });

    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');

    revalidatePath(path);
    return { success: true };
  });
