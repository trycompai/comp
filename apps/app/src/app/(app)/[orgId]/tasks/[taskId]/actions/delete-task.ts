'use server';

import { authActionClient } from '@/actions/safe-action';
import { requireOrgMembership } from '@/lib/orgs/require-org-membership';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const deleteTaskSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  orgId: z.string().min(1),
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
    const { id, orgId } = parsedInput;
    await requireOrgMembership({ orgId, userId: ctx.user.id });

    try {
      const task = await db.task.findUnique({
        where: {
          id,
          organizationId: orgId,
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
        where: { id, organizationId: orgId },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${orgId}/tasks`);
      revalidatePath(`/${orgId}/tasks/all`);
      revalidateTag('tasks');

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
