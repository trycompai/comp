'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@db/server';
import type { Prisma } from '@db/server';
import { authActionClient } from '../safe-action';

const setActiveVersionSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  versionId: z.string().min(1, 'Version ID is required'),
  entityId: z.string(),
});

export const setActiveVersionAction = authActionClient
  .inputSchema(setActiveVersionSchema)
  .metadata({
    name: 'set-active-policy-version',
    track: {
      event: 'set-active-policy-version',
      description: 'Set policy version as active',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, versionId } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return { success: false, error: 'Not authorized' };
    }

    // Verify policy exists and belongs to organization
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId: activeOrganizationId },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    // Prevent activating a different version when another is pending approval
    if (policy.pendingVersionId && policy.pendingVersionId !== versionId) {
      return { success: false, error: 'Another version is already pending approval' };
    }

    // Get version to activate
    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.policyId !== policyId) {
      return { success: false, error: 'Version not found' };
    }

    // Update policy to set this version as active
    // Clear pending approval state since we're directly activating a version
    await db.policy.update({
      where: { id: policyId },
      data: {
        currentVersionId: versionId,
        content: version.content as Prisma.InputJsonValue[],
        draftContent: version.content as Prisma.InputJsonValue[], // Sync draft to prevent "unpublished changes" UI bug
        status: 'published',
        pendingVersionId: null,
        approverId: null,
        // Clear signatures - employees must re-acknowledge new content
        signedBy: [],
      },
    });

    revalidatePath(`/${activeOrganizationId}/policies/${policyId}`);
    revalidatePath(`/${activeOrganizationId}/policies`);

    return {
      success: true,
      data: {
        versionId: version.id,
        version: version.version,
      },
    };
  });
