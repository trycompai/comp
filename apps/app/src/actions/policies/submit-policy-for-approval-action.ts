'use server';

import { db, PolicyStatus } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '../safe-action';
import { getUpdatePolicyFormSchema } from '../schema';

export const submitPolicyForApprovalAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getUpdatePolicyFormSchema(t);
  })
  .metadata({
    name: 'submit-policy-for-approval',
    track: {
      event: 'submit-policy-for-approval',
      description: 'Submit Policy for Approval',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    const {
      id,
      assigneeId,
      department,
      review_frequency,
      review_date,
      isRequiredToSign,
      approverId,
    } = parsedInput;
    const { user, session } = ctx;

    if (!user.id || !session.activeOrganizationId) {
      throw new Error(t('Unauthorized'));
    }

    if (!approverId) {
      throw new Error(t('Approver is required'));
    }

    try {
      const newReviewDate = review_date;

      await db.policy.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          status: PolicyStatus.needs_review,
          assigneeId,
          department,
          frequency: review_frequency,
          reviewDate: newReviewDate,
          isRequiredToSign: isRequiredToSign === 'required',
          approverId,
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/policies/${id}`);

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
