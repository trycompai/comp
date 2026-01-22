'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const deleteTaskSchema = z.object({
  id: z.string(),
  entityId: z.string(),
});

export const deleteTaskAction = authActionClient
  .inputSchema(deleteTaskSchema)
  .metadata({
    name: 'delete-task',
    track: {
      event: 'delete-task',
      description: 'Delete Task',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const task = await db.task.findUnique({
        where: {
          id,
          organizationId: activeOrganizationId,
        },
      });

      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      // Delete the task
      await db.task.delete({
        where: { id },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${activeOrganizationId}/tasks`);
      revalidatePath(`/${activeOrganizationId}/tasks/all`);
      revalidateTag('tasks', 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to delete task',
      };
    }
  });
