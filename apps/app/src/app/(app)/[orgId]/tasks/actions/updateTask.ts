'use server';

import { auth } from '@/utils/auth';
import { db, Task } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export const updateTask = async (input: Partial<Task>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { id, ...rest } = input;

  if (!session?.session?.activeOrganizationId) {
    return {
      success: false,
      error: 'Not authorized - no organization found',
    };
  }

  try {
    const task = await db.task.update({
      where: {
        id,
        organizationId: session.session.activeOrganizationId,
      },
      data: { ...rest, updatedAt: new Date() },
    });

    const orgId = session.session.activeOrganizationId;

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
