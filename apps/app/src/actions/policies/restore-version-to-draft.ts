'use server';

import { db, type Prisma } from '@db/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

const restoreVersionToDraftSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  versionId: z.string().min(1, 'Version ID is required'),
  entityId: z.string(),
});

export const restoreVersionToDraftAction = authActionClient
  .inputSchema(restoreVersionToDraftSchema)
  .metadata({
    name: 'restore-policy-version-to-draft',
    track: {
      event: 'restore-policy-version-to-draft',
      description: 'Restored policy version to draft',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, versionId } = parsedInput;
    const { activeOrganizationId } = ctx.session;
    const { user } = ctx;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!user) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      // Verify the policy belongs to the organization
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId: activeOrganizationId },
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found',
        };
      }

      // Get the version to restore
      const version = await db.policyVersion.findUnique({
        where: { id: versionId },
      });

      if (!version || version.policyId !== policyId) {
        return {
          success: false,
          error: 'Version not found',
        };
      }

      // Copy the version content to draftContent
      await db.policy.update({
        where: { id: policyId },
        data: {
          draftContent: version.content as Prisma.InputJsonValue[],
        },
      });

      revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);

      return {
        success: true,
        data: {
          versionId: version.id,
          version: version.version,
        },
      };
    } catch (error) {
      console.error('Error restoring policy version to draft:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore version to draft',
      };
    }
  });
