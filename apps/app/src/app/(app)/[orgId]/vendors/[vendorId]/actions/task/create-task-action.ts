// create-task-action.ts

'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createVendorTaskSchema } from '../schema';

export const createVendorTaskAction = authActionClient
  .inputSchema(createVendorTaskSchema)
  .metadata({
    name: 'create-vendor-task',
    track: {
      event: 'create-vendor-task',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { vendorId, title, description, dueDate, assigneeId } = parsedInput;
    const {
      session: { activeOrganizationId },
      user,
    } = ctx;

    if (!user.id || !activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    try {
      await db.task.create({
        data: {
          title,
          description,
          assigneeId,
          organizationId: activeOrganizationId,
          vendors: {
            connect: {
              id: vendorId,
            },
          },
        },
      });

      revalidatePath(`/${activeOrganizationId}/vendor/${vendorId}`);
      revalidateTag(`vendor_${activeOrganizationId}`, 'max');

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  });
