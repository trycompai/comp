'use server';

import { auth } from '@/utils/auth';
import { db, Task } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getGT } from 'gt-next/server';

export const updateTask = async (input: Partial<Task>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { id, ...rest } = input;
  const t = await getGT();

  if (!session?.session?.activeOrganizationId) {
    return {
      success: false,
      error: t('Not authorized - no organization found'),
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

    return {
      success: true,
      task,
    };
  } catch (error) {
    console.error('Failed to update task:', error);
    return {
      success: false,
      error: t('Failed to update task'),
    };
  }
};
