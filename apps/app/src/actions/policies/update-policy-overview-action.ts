// update-policy-overview-action.ts

'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { getGT } from 'gt-next/server';
import { authActionClient } from '../safe-action';
import { getUpdatePolicyOverviewSchema } from '../schema';

export const updatePolicyOverviewAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getUpdatePolicyOverviewSchema(t);
  })
  .metadata({
    name: 'update-policy-overview',
    track: {
      event: 'update-policy-overview',
      description: 'Update Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const { id, title, description, isRequiredToSign } = parsedInput;
    const { user, session } = ctx;

    if (!user) {
      return {
        success: false,
        error: t('Not authorized'),
      };
    }

    if (!session.activeOrganizationId) {
      return {
        success: false,
        error: t('Not authorized'),
      };
    }

    try {
      const policy = await db.policy.findUnique({
        where: { id, organizationId: session.activeOrganizationId },
      });

      if (!policy) {
        return {
          success: false,
          error: t('Policy not found'),
        };
      }

      await db.policy.update({
        where: { id },
        data: {
          name: title,
          description,
          // Use type assertion to handle the new field
          // that might not be in the generated types yet
          ...(isRequiredToSign !== undefined
            ? ({
                isRequiredToSign: isRequiredToSign === 'required',
              } as any)
            : {}),
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
        error: t('Failed to update policy overview'),
      };
    }
  });
