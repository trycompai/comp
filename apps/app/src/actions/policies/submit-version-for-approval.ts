'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db, PolicyStatus } from '@db';
import { authActionClient } from '../safe-action';

const submitVersionForApprovalSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
  versionId: z.string().min(1, 'Version ID is required'),
  approverId: z.string().min(1, 'Approver is required'),
  entityId: z.string(),
});

export const submitVersionForApprovalAction = authActionClient
  .inputSchema(submitVersionForApprovalSchema)
  .metadata({
    name: 'submit-version-for-approval',
    track: {
      event: 'submit-version-for-approval',
      description: 'Submit policy version for approval',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, versionId, approverId } = parsedInput;
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

    // Check if another version is already pending
    if (policy.pendingVersionId && policy.pendingVersionId !== versionId) {
      return { success: false, error: 'Another version is already pending approval' };
    }

    // Get version
    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.policyId !== policyId) {
      return { success: false, error: 'Version not found' };
    }

    // Cannot submit the already-active version for approval
    if (versionId === policy.currentVersionId) {
      return { success: false, error: 'Cannot submit the currently published version for approval' };
    }

    // Verify approver exists and belongs to organization
    const approver = await db.member.findUnique({
      where: { id: approverId },
    });

    if (!approver || approver.organizationId !== activeOrganizationId) {
      return { success: false, error: 'Approver not found' };
    }

    // Update policy to set pending version and status
    await db.policy.update({
      where: { id: policyId },
      data: {
        pendingVersionId: versionId,
        status: PolicyStatus.needs_review,
        approverId,
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
