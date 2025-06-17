'use server';

import { db } from '@comp/db';
import { PolicyStatus } from '@comp/db/types';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updatePolicyFormSchema } from '../schema';

export const submitPolicyForApprovalAction = authActionClient
  .inputSchema(updatePolicyFormSchema)
  .metadata({
    name: 'submit-policy-for-approval',
    track: {
      event: 'submit-policy-for-approval',
      description: 'Submit Policy for Approval',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
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
      throw new Error('Unauthorized');
    }

    if (!approverId) {
      throw new Error('Approver is required');
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
