'use server';

import { sendPublishAllPoliciesEmail } from '@/trigger/tasks/email/publish-all-policies-email';
import { db, PolicyStatus, Role, type Prisma } from '@db/server';
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
  .action(async ({ ctx, parsedInput }) => {
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

    const member = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId: parsedInput.organizationId,
        deactivated: false,
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
      // Get all policies that are not published (draft or needs_review)
      const policies = await db.policy.findMany({
        where: {
          organizationId: parsedInput.organizationId,
          status: { in: [PolicyStatus.draft, PolicyStatus.needs_review] },
        },
      });

      if (!policies || policies.length === 0) {
        return {
          success: false,
          error: 'No policies found',
        };
      }

      for (const policy of policies) {
        try {
          // Check if policy has a current version, if not create version 1
          if (!policy.currentVersionId) {
            // Use transaction to prevent orphaned versions on partial failure
            await db.$transaction(async (tx) => {
              // Create version 1 from current policy content
              const newVersion = await tx.policyVersion.create({
                data: {
                  policyId: policy.id,
                  version: 1,
                  content: (policy.content as Prisma.InputJsonValue[]) || [],
                  pdfUrl: policy.pdfUrl,
                  publishedById: member.id,
                  changelog: 'Initial published version',
                },
              });

              // Update policy with the new version and publish
              await tx.policy.update({
                where: { id: policy.id },
                data: {
                  status: PolicyStatus.published,
                  currentVersionId: newVersion.id,
                  assigneeId: member.id,
                  reviewDate: new Date(new Date().setDate(new Date().getDate() + 90)),
                  lastPublishedAt: new Date(),
                  draftContent: (policy.content as Prisma.InputJsonValue[]) || [],
                  // Clear approval fields (in case policy was in needs_review)
                  approverId: null,
                  pendingVersionId: null,
                },
              });
            });
          } else {
            // Policy already has a version, just update status
            // Get the current version content to sync draftContent
            const currentVersion = await db.policyVersion.findUnique({
              where: { id: policy.currentVersionId },
              select: { content: true },
            });

            await db.policy.update({
              where: { id: policy.id },
              data: {
                status: PolicyStatus.published,
                assigneeId: member.id,
                reviewDate: new Date(new Date().setDate(new Date().getDate() + 90)),
                lastPublishedAt: new Date(),
                // Sync draftContent with the published version content
                draftContent: (currentVersion?.content as Prisma.InputJsonValue[]) || (policy.content as Prisma.InputJsonValue[]) || [],
                // Clear approval fields (in case policy was in needs_review)
                approverId: null,
                pendingVersionId: null,
              },
            });
          }
        } catch (policyError) {
          console.error(`[publish-all-policies] Failed to update policy ${policy.id}:`, {
            error: policyError,
            policyId: policy.id,
            policyName: policy.name,
            memberId: member.id,
            organizationId: parsedInput.organizationId,
          });
          throw policyError; // Re-throw to be caught by outer catch block
        }
      }

      // Get organization info and all members to send emails
      const organization = await db.organization.findUnique({
        where: { id: parsedInput.organizationId },
        select: { name: true },
      });

      const members = await db.member.findMany({
        where: {
          organizationId: parsedInput.organizationId,
          isActive: true,
          deactivated: false,
          OR: [{ role: { contains: Role.employee } }, { role: { contains: Role.contractor } }],
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      // Trigger email tasks for all employees using batchTrigger
      const emailPayloads = members
        .filter((orgMember) => orgMember.user.email)
        .map((orgMember) => ({
          payload: {
            email: orgMember.user.email,
            userName: orgMember.user.name || 'there',
            organizationName: organization?.name || 'Your organization',
            organizationId: parsedInput.organizationId,
          },
        }));

      if (emailPayloads.length > 0) {
        try {
          await sendPublishAllPoliciesEmail.batchTrigger(emailPayloads);
        } catch (emailError) {
          console.error('[publish-all-policies] Failed to trigger bulk emails:', emailError);
          // Don't throw - the policies are published successfully
        }
      }

      revalidatePath(`/${parsedInput.organizationId}/policies`);
      revalidatePath(`/${parsedInput.organizationId}/frameworks`);
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
        organizationId: parsedInput.organizationId,
      });

      return {
        success: false,
        error: 'Failed to publish all policies',
      };
    }
  });
