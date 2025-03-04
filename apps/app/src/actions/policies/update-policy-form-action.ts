// update-policy-form-action.ts

"use server";

import { db } from "@bubba/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { authActionClient } from "../safe-action";
import { updatePolicyFormSchema } from "../schema";
import { PolicyStatus } from "@bubba/db";

// Helper function to calculate next review date based on frequency
function calculateNextReviewDate(
  frequency: string,
  baseDate: Date = new Date(),
): Date {
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // If frequency is not recognized, default to yearly
      nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
}

export const updatePolicyFormAction = authActionClient
  .schema(updatePolicyFormSchema)
  .metadata({
    name: "update-policy-form",
    track: {
      event: "update-policy-form",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id, status, ownerId, department, review_frequency, review_date } =
      parsedInput;
    const { user } = ctx;

    if (!user.id || !user.organizationId) {
      throw new Error("Invalid user input");
    }

    try {
      // Get the current policy to check if status is changing to published
      const currentPolicy = await db.organizationPolicy.findUnique({
        where: {
          id,
          organizationId: user.organizationId,
        },
        select: {
          status: true,
        },
      });

      // Determine if we need to update the review date
      let reviewDate = review_date;
      let lastPublishedAt = undefined;

      // If status is changing to 'published', calculate next review date based on frequency
      if (
        status === PolicyStatus.published &&
        currentPolicy?.status !== PolicyStatus.published
      ) {
        reviewDate = calculateNextReviewDate(review_frequency);
        lastPublishedAt = new Date(); // Set lastPublishedAt to now when publishing
      }

      await db.organizationPolicy.update({
        where: {
          id,
          organizationId: user.organizationId,
        },
        data: {
          status,
          ownerId,
          department,
          frequency: review_frequency,
          reviewDate,
          ...(lastPublishedAt && { lastPublishedAt }),
        },
      });

      revalidatePath("/policies");
      revalidatePath(`/policies/all/${id}`);
      revalidateTag("policies");

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error updating policy:", error);

      return {
        success: false,
      };
    }
  });
