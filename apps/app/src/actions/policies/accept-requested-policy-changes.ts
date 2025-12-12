'use server';

import { sendNewPolicyEmail } from '@/trigger/tasks/email/new-policy-email';
import { db, PolicyStatus } from '@db';
import { tasks } from '@trigger.dev/sdk';
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
          reviewDate: new Date(), // Update reviewDate to current date
        },
      });

      // Get all employees in the organization to send notifications
      const employees = await db.member.findMany({
        where: {
          organizationId: session.activeOrganizationId,
          isActive: true,
          deactivated: false,
        },
        include: {
          user: true,
        },
      });

      // Filter to get only employees and contractors
      const employeeMembers = employees.filter((member) => {
        const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
        return roles.includes('employee') || roles.includes('contractor');
      });

      // Prepare the events array for the API
      const events = employeeMembers
        .filter((employee) => employee.user.email)
        .map((employee) => {
          let notificationType: 'new' | 're-acceptance' | 'updated';
          const wasAlreadySigned = policy.signedBy.includes(employee.id);
          if (isNewPolicy) {
            notificationType = 'new';
          } else if (wasAlreadySigned) {
            notificationType = 're-acceptance';
          } else {
            notificationType = 'updated';
          }

          return {
            email: employee.user.email,
            userName: employee.user.name || employee.user.email || 'Employee',
            policyName: policy.name,
            organizationId: session.activeOrganizationId || '',
            organizationName: policy.organization.name,
            notificationType,
          };
        });

      // Call the API route to send the emails
      await Promise.all(
        events.map((event) =>
          tasks.trigger<typeof sendNewPolicyEmail>('send-new-policy-email', event),
        ),
      );

      // If a comment was provided, create a comment
      if (comment && comment.trim() !== '') {
        const member = await db.member.findFirst({
          where: {
            userId: user.id,
            organizationId: session.activeOrganizationId,
            deactivated: false,
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
      revalidateTag('policies', 'max');

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
