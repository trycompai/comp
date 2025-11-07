'use server';

import { authActionClient } from '@/actions/safe-action';
import { db, TaskStatus } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateTaskStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(TaskStatus),
});

export const updateTaskStatusAction = authActionClient
  .inputSchema(updateTaskStatusSchema)
  .metadata({
    name: 'update-task-status',
    track: {
      event: 'update_task_status',
      description: 'Update Task Status from List View',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, status } = parsedInput;
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

      // Update the task status
      await db.task.update({
        where: { id },
        data: { status },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${activeOrganizationId}/tasks`);

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to update task status',
      };
    }
  });
