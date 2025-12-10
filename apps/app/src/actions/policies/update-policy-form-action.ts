// update-policy-form-action.ts

'use server';

import { db, PolicyStatus } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { updatePolicyFormSchema } from '../schema';

// Helper function to calculate next review date based on frequency
function calculateNextReviewDate(frequency: string, baseDate: Date = new Date()): Date {
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // If frequency is not recognized, default to yearly
      nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
}

export const updatePolicyFormAction = authActionClient
  .inputSchema(updatePolicyFormSchema)
  .metadata({
    name: 'update-policy-form',
    track: {
      event: 'update-policy-form',
      description: 'Update Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, status, assigneeId, department, review_frequency, review_date } = parsedInput;
    const { user, session } = ctx;

    if (!user.id || !session.activeOrganizationId) {
      throw new Error('Unauthorized');
    }

    try {
      // Get the current policy to check if status is changing to published
      const currentPolicy = await db.policy.findUnique({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        select: {
          status: true,
        },
      });

      // Determine if we need to update the review date
      let reviewDate = review_date;
      let lastPublishedAt = undefined;

      // If status is changing to 'published', calculate next review date based on frequency
      if (status === PolicyStatus.published && currentPolicy?.status !== PolicyStatus.published) {
        reviewDate = calculateNextReviewDate(review_frequency);
        lastPublishedAt = new Date(); // Set lastPublishedAt to now when publishing
      }

      await db.policy.update({
        where: {
          id,
          organizationId: session.activeOrganizationId,
        },
        data: {
          status,
          assigneeId,
          department,
          frequency: review_frequency,
          reviewDate,
          ...(lastPublishedAt && { lastPublishedAt }),
        },
      });

      revalidatePath(`/${session.activeOrganizationId}/policies`);
      revalidatePath(`/${session.activeOrganizationId}/policies/${id}`);
      revalidateTag('policies', 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating policy:', error);

      return {
        success: false,
      };
    }
  });
