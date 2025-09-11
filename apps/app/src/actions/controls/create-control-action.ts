'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const createControlSchema = z.object({
  name: z.string().min(1, {
    message: 'Name is required',
  }),
  description: z.string().min(1, {
    message: 'Description is required',
  }),
  policyIds: z.array(z.string()).optional(),
  taskIds: z.array(z.string()).optional(),
  requirementMappings: z
    .array(
      z.object({
        requirementId: z.string(),
        frameworkInstanceId: z.string(),
      }),
    )
    .optional(),
});

export const createControlAction = authActionClient
  .inputSchema(createControlSchema)
  .metadata({
    name: 'create-control',
    track: {
      event: 'create-control',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { name, description, policyIds, taskIds, requirementMappings } = parsedInput;
    const {
      session: { activeOrganizationId },
      user,
    } = ctx;

    if (!user.id || !activeOrganizationId) {
      throw new Error('Invalid user input');
    }

    try {
      const control = await db.control.create({
        data: {
          name,
          description,
          organizationId: activeOrganizationId,
          ...(policyIds &&
            policyIds.length > 0 && {
              policies: {
                connect: policyIds.map((id) => ({ id })),
              },
            }),
          ...(taskIds &&
            taskIds.length > 0 && {
              tasks: {
                connect: taskIds.map((id) => ({ id })),
              },
            }),
          // Note: Requirements mapping is handled through RequirementMap table
        },
      });

      // Handle requirement mappings separately if provided
      if (requirementMappings && requirementMappings.length > 0) {
        await Promise.all(
          requirementMappings.map((mapping) =>
            db.requirementMap.create({
              data: {
                controlId: control.id,
                requirementId: mapping.requirementId,
                frameworkInstanceId: mapping.frameworkInstanceId,
              },
            }),
          ),
        );
      }

      // Revalidate the path based on the header
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
        control,
      };
    } catch (error) {
      console.error('Failed to create control:', error);
      return {
        success: false,
        error: 'Failed to create control',
      };
    }
  });
