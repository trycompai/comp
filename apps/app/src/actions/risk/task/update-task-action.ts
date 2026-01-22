// update-task-action.ts

'use server';

import type { TaskStatus } from '@db';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../../safe-action';
import { updateTaskSchema } from '../../schema';

export const updateTaskAction = authActionClient
  .inputSchema(updateTaskSchema)
  .metadata({
    name: 'update-task',
    track: {
      event: 'update-task',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, status, assigneeId, title, description } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    try {
      const task = await db.task.findUnique({
        where: {
          id: id,
        },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      await db.task.update({
        where: {
          id: id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          status: status as TaskStatus,
          assigneeId,
          title: title,
          description: description,
          updatedAt: new Date(),
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/risk`);
      revalidatePath(`/${session.activeOrganizationId}/risk/${id}`);
      revalidatePath(`/${session.activeOrganizationId}/risk/${id}/tasks/${id}`);
      revalidateTag('risks', 'max');

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  });
