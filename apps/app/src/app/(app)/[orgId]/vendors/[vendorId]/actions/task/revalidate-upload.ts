'use server';

import { authActionClient } from '@/actions/safe-action';
import { getUploadTaskFileSchema } from '@/actions/schema';
import { getGT } from 'gt-next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const revalidateUpload = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getUploadTaskFileSchema(t);
  })
  .metadata({
    name: 'upload-task-file',
    track: {
      event: 'upload-task-file',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { riskId, taskId } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    revalidatePath(`/${session.activeOrganizationId}/risk/${riskId}`);
    revalidatePath(`/${session.activeOrganizationId}/risk/${riskId}/tasks/${taskId}`);
    revalidateTag('risk-cache');

    return {
      riskId,
      taskId,
    };
  });
