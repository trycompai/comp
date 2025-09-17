'use server';

import { db, PolicyStatus } from '@db';
import { sendPolicyNotificationEmail } from '@trycompai/email';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

const acceptRequestedPolicyChangesSchema = z.object({
  id: z.string(),
  approverId: z.string(),
  comment: z.string().optional(),
  entityId: z.string(),
});

export const acceptRequestedPolicyChangesAction = authActionClient
  .inputSchema(acceptRequestedPolicyChangesSchema)
  .metadata({
    name: 'accept-requested-policy-changes',
    track: {
      event: 'accept-requested-policy-changes',
      description: 'Accept Policy Changes',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, approverId, comment } = parsedInput;
    const { user, session } = ctx;

    if (!user.id || !session.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    if (!approverId) {
      throw new Error('Approver is required');
    }

    try {
      const policy = await db.policy.findUnique({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!policy) {
        throw new Error('Policy not found');
      }

      if (policy.approverId !== approverId) {
        throw new Error('Approver is not the same');
      }

      // Check if there were previous signers to determine notification type
      const isNewPolicy = policy.lastPublishedAt === null;

      // Update policy status and clear signedBy field
      await db.policy.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          status: PolicyStatus.published,
          approverId: null,
          signedBy: [], // Clear the signedBy field
          lastPublishedAt: new Date(), // Update last published date
        },
      });

      // Get all employees in the organization to send notifications
      const employees = await db.member.findMany({
        where: {
          organizationId: session.activeOrganizationId,
          isActive: true,
        },
        include: {
          user: true,
        },
      });

      // Filter to get only employees
      const employeeMembers = employees.filter((member) => {
        const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
        return roles.includes('employee');
      });

      // Send notification emails to all employees
      // Send emails in batches of 2 per second to respect rate limit
      const BATCH_SIZE = 2;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const sendEmailsInBatches = async () => {
        for (let i = 0; i < employeeMembers.length; i += BATCH_SIZE) {
          const batch = employeeMembers.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (employee) => {
              if (!employee.user.email) return;

              let notificationType: 'new' | 're-acceptance' | 'updated';
              const wasAlreadySigned = policy.signedBy.includes(employee.id);
              if (isNewPolicy) {
                notificationType = 'new';
              } else if (wasAlreadySigned) {
                notificationType = 're-acceptance';
              } else {
                notificationType = 'updated';
              }

              try {
                await sendPolicyNotificationEmail({
                  email: employee.user.email,
                  userName: employee.user.name || employee.user.email || 'Employee',
                  policyName: policy.name,
                  organizationName: policy.organization.name,
                  organizationId: session.activeOrganizationId,
                  notificationType,
                });
              } catch (emailError) {
                console.error(`Failed to send email to ${employee.user.email}:`, emailError);
                // Don't fail the whole operation if email fails
              }
            })
          );

          // Only delay if there are more emails to send
          if (i + BATCH_SIZE < employeeMembers.length) {
            await delay(1000); // wait 1 second between batches
          }
        }
      };

      // Fire and forget, but log errors if any
      sendEmailsInBatches().catch((error) => {
        console.error('Some emails failed to send:', error);
      });

      // If a comment was provided, create a comment
      if (comment && comment.trim() !== '') {
        const member = await db.member.findFirst({
          where: {
            userId: user.id,
            organizationId: session.activeOrganizationId,
          },
        });

        if (member) {
          await db.comment.create({
            data: {
              content: `Policy changes accepted: ${comment}`,
              entityId: id,
              entityType: 'policy',
              organizationId: session.activeOrganizationId,
              authorId: member.id,
            },
          });
        }
      }

      revalidatePath(`/${session.activeOrganizationId}/policies`);
      revalidatePath(`/${session.activeOrganizationId}/policies/${id}`);
      revalidateTag('policies');

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error submitting policy for approval:', error);

      return {
        success: false,
      };
    }
  });
