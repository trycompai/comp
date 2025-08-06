'use server';

import { db, PolicyStatus } from '@db';
import { getGT } from 'gt-next/server';
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
    const t = await getGT();
    const { id, approverId, comment } = parsedInput;
    const { user, session } = ctx;

    if (!user.id || !session.activeOrganizationId) {
      throw new Error(t('Unauthorized'));
    }

    if (!approverId) {
      throw new Error(t('Approver is required'));
    }

    try {
      const policy = await db.policy.findUnique({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
      });

      if (!policy) {
        throw new Error(t('Policy not found'));
      }

      if (policy.approverId !== approverId) {
        throw new Error(t('Approver is not the same'));
      }

      // Update policy status
      await db.policy.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          status: PolicyStatus.published,
          approverId: null,
        },
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
              content: t('Policy changes accepted: {comment}', { comment }),
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
