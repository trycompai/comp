'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

export const regenerateTaskAction = authActionClient
  .inputSchema(
    z.object({
      taskId: z.string().min(1),
    }),
  )
  .metadata({
    name: 'regenerate-task',
    track: {
      event: 'regenerate-task',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { taskId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    // Get the task with its template
    const task = await db.task.findUnique({
      where: {
        id: taskId,
        organizationId: session.activeOrganizationId,
      },
      include: {
        taskTemplate: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.taskTemplate) {
      throw new Error('Task has no associated template to regenerate from');
    }

    // Log current state
    console.log('[regenerateTask] Task ID:', taskId);
    console.log('[regenerateTask] Task current automationStatus:', task.automationStatus);
    console.log('[regenerateTask] Template ID:', task.taskTemplate.id);
    console.log('[regenerateTask] Template automationStatus:', task.taskTemplate.automationStatus);
    console.log('[regenerateTask] Updating task with:', {
      title: task.taskTemplate.name,
      description: task.taskTemplate.description?.substring(0, 50) + '...',
      automationStatus: task.taskTemplate.automationStatus,
    });

    // Update the task with the template's current title, description, and automationStatus
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        title: task.taskTemplate.name,
        description: task.taskTemplate.description,
        automationStatus: task.taskTemplate.automationStatus,
      },
    });

    console.log('[regenerateTask] Updated task automationStatus:', updatedTask.automationStatus);

    // Revalidate the path based on the header
    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    revalidatePath(path);

    return { success: true };
  });
