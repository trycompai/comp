'use server';

import { z } from 'zod';
import { db } from '@db';
import { authActionClient } from '../safe-action';

const getPolicyVersionsSchema = z.object({
  policyId: z.string().min(1, 'Policy ID is required'),
});

export const getPolicyVersionsAction = authActionClient
  .inputSchema(getPolicyVersionsSchema)
  .metadata({
    name: 'get-policy-versions',
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return { success: false, error: 'Not authorized' };
    }

    // Verify policy exists and belongs to organization
    const policy = await db.policy.findFirst({
      where: { id: policyId, organizationId: activeOrganizationId },
      select: { id: true, currentVersionId: true, pendingVersionId: true },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found' };
    }

    // Get all versions
    const versions = await db.policyVersion.findMany({
      where: { policyId },
      orderBy: { version: 'desc' },
      include: {
        publishedBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        versions,
        currentVersionId: policy.currentVersionId,
        pendingVersionId: policy.pendingVersionId,
      },
    };
  });
