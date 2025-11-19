'use server';

import { auth } from '@/utils/auth';
import { db, Task } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export const updateTask = async (orgId: string, input: Partial<Task> & { id: string }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { id, ...rest } = input;

  if (!session) {
    return {
      success: false,
      error: 'Not authorized',
    };
  }

  const membership = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!membership) {
    return {
      success: false,
      error: 'Not authorized',
    };
  }

  try {
    const task = await db.task.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: { ...rest, updatedAt: new Date() },
    });

    revalidatePath(`/${orgId}/tasks`);
    revalidatePath(`/${orgId}/tasks/${id}`);

    return {
      success: true,
      task,
    };
  } catch (error) {
    console.error('Failed to update task:', error);
    return {
      success: false,
      error: 'Failed to update task',
    };
  }
};
