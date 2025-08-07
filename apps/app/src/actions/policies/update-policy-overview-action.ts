// update-policy-overview-action.ts

'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updatePolicyOverviewSchema } from '../schema';

export const updatePolicyOverviewAction = authActionClient
  .inputSchema(updatePolicyOverviewSchema)
  .metadata({
    name: 'update-policy-overview',
    track: {
      event: 'update-policy-overview',
      description: 'Update Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, title, description } = parsedInput;
    const { user, session } = ctx;

    if (!user) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!session.activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const policy = await db.policy.findUnique({
        where: { id, organizationId: session.activeOrganizationId },
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found',
        };
      }

      await db.policy.update({
        where: { id },
        data: {
          name: title,
          description,
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/policies/${id}`);
      revalidatePath(`/${session.activeOrganizationId}/policies/all`);
      revalidatePath(`/${session.activeOrganizationId}/policies`);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update policy overview',
      };
    }
  });
