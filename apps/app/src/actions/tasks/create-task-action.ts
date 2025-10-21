'use server';

import { authActionClient } from '@/actions/safe-action';
import { db, Departments, TaskFrequency } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, {
    message: 'Title is required',
  }),
  description: z.string().min(1, {
    message: 'Description is required',
  }),
  assigneeId: z.string().nullable().optional(),
  frequency: z.nativeEnum(TaskFrequency).nullable().optional(),
  department: z.nativeEnum(Departments).nullable().optional(),
  controlIds: z.array(z.string()).optional(),
  taskTemplateId: z.string().nullable().optional(),
});

export const createTaskAction = authActionClient
  .inputSchema(createTaskSchema)
  .metadata({
    name: 'create-task',
    track: {
      event: 'create-task',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { title, description, assigneeId, frequency, department, controlIds, taskTemplateId } =
      parsedInput;
    const {
      session: { activeOrganizationId },
      user,
    } = ctx;

    if (!user.id || !activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    try {
      const task = await db.task.create({
        data: {
          title,
          description,
          assigneeId: assigneeId || null,
          organizationId: activeOrganizationId,
          status: 'todo',
          order: 0,
          frequency: frequency || null,
          department: department || null,
          taskTemplateId: taskTemplateId || null,
          ...(controlIds &&
            controlIds.length > 0 && {
              controls: {
                connect: controlIds.map((id) => ({ id })),
              },
            }),
        },
      });

      // Revalidate the path based on the header
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('Failed to create task:', error);
      return {
        success: false,
        error: 'Failed to create task',
      };
    }
  });
