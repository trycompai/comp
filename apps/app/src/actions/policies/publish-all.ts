'use server';

import { db, PolicyStatus } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

const publishAllPoliciesSchema = z.object({
  organizationId: z.string(),
});

export const publishAllPoliciesAction = authActionClient
  .inputSchema(publishAllPoliciesSchema)
  .metadata({
    name: 'publish-all-policies',
    track: {
      event: 'publish-all-policies',
      description: 'Publish All Policies',
      channel: 'server',
    },
  })
  .action(async ({ ctx }) => {
    const { user, session } = ctx;

    if (!user) {
      console.log('[publish-all-policies] User not found');
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    if (!session.activeOrganizationId) {
      console.log('[publish-all-policies] No active organization ID');
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    const member = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId: session.activeOrganizationId,
      },
    });

    if (!member) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    // Check if user is an owner
    if (!member.role.includes('owner')) {
      console.log('[publish-all-policies] User is not an owner');
      return {
        success: false,
        error: 'Only organization owners can publish all policies',
      };
    }

    try {
      const policies = await db.policy.findMany({
        where: { organizationId: session.activeOrganizationId, status: PolicyStatus.draft },
      });

      if (!policies || policies.length === 0) {
        return {
          success: false,
          error: 'No policies found',
        };
      }

      for (const policy of policies) {
        try {
          const updatedPolicy = await db.policy.update({
            where: { id: policy.id },
            data: {
              status: PolicyStatus.published,
              assigneeId: member.id,
              reviewDate: new Date(new Date().setDate(new Date().getDate() + 90)),
            },
          });
        } catch (policyError) {
          console.error(`[publish-all-policies] Failed to update policy ${policy.id}:`, {
            error: policyError,
            policyId: policy.id,
            policyName: policy.name,
            memberId: member.id,
            organizationId: session.activeOrganizationId,
          });
          throw policyError; // Re-throw to be caught by outer catch block
        }
      }

      revalidatePath(`/${session.activeOrganizationId}/policies`);
      revalidatePath(`/${session.activeOrganizationId}/frameworks`);
      return {
        success: true,
      };
    } catch (error) {
      console.error('[publish-all-policies] Error in publish all policies action:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        userId: user?.id,
        memberId: member?.id,
        organizationId: session.activeOrganizationId,
      });

      return {
        success: false,
        error: 'Failed to publish all policies',
      };
    }
  });
