"use server";

import { db } from "@bubba/db";
import { auth } from "@/auth";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { appErrors } from "./types";
import type { ActionResponse } from "./types";

const updateTestAssignedUserSchema = z.object({
  testId: z.string(),
  userId: z.string().nullable(),
});

export const updateTestAssignedUser = createSafeActionClient()
  .schema(updateTestAssignedUserSchema)
  .action(async ({ testId, userId }): Promise<ActionResponse<boolean>> => {
    try {
      const session = await auth();
      const organizationId = session?.user.organizationId;

      if (!organizationId) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      // Update the assignedUserId in the Organization_integration_results table
      await db.$executeRaw`
        UPDATE "Organization_integration_results"
        SET "assignedUserId" = ${userId}
        WHERE id = ${testId} AND "organizationId" = ${organizationId}
      `;

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error("Error updating test assigned user:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });
