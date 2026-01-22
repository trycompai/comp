// update-task-action.ts

'use server';

import { authActionClient } from '@/actions/safe-action';
import type { TaskStatus } from '@db';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { updateVendorTaskSchema } from '../schema';

export const updateVendorTaskAction = authActionClient
  .inputSchema(updateVendorTaskSchema)
  .metadata({
    name: 'update-vendor-task',
    track: {
      event: 'update-vendor-task',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, title, description, dueDate, status, assigneeId } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    if (!assigneeId) {
      throw new Error('Assignee ID is required');
    }

    try {
      const task = await db.task.findUnique({
        where: {
          id: id,
        },
        select: {
          vendors: {
            select: {
              id: true,
            },
          },
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
          title,
          description,
          status: status as TaskStatus,
          assigneeId,
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/vendors/${task.vendors[0].id}`);
      revalidatePath(`/${session.activeOrganizationId}/vendors/${task.vendors[0].id}/tasks/${id}`);
      revalidateTag(`vendor_${session.activeOrganizationId}`, 'max');

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  });
