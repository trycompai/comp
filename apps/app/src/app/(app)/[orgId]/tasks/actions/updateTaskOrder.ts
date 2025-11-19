'use server';

import type { ActionResponse } from '@/types/actions';
import { auth } from '@/utils/auth';
import { db, TaskStatus } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const updateTaskOrderSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number(),
    status: z.nativeEnum(TaskStatus),
  }),
);

export const updateTaskOrder = async (
  orgId: string,
  input: z.infer<typeof updateTaskOrderSchema>,
): Promise<ActionResponse> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return {
      success: false,
      error: 'Not authorized - no organization found',
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
      error: 'Not authorized - no organization found',
    };
  }

  try {
    for (const { id, order, status } of input) {
      await db.task.update({
        where: {
          id,
          organizationId: orgId,
        },
        data: { order, status },
      });
    }
    revalidatePath(`/${orgId}/tasks`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Failed to update task order:', error);
    return {
      success: false,
      error: 'Failed to update task order',
    };
  }
};
