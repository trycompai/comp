"use server";

import { authActionClient } from "@/actions/safe-action";
import type { ActionResponse } from "@/actions/types";
import { auth } from "@/auth";
import { db } from "@bubba/db";
import { revalidatePath } from "next/cache";
import { appErrors, updatePolicySchema } from "../types";

export const updatePolicy = authActionClient
  .schema(updatePolicySchema)
  .metadata({
    name: "update-policy",
    track: {
      event: "update-policy",
      channel: "server",
    },
  })
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    const { policyId, content, status } = parsedInput;

    const session = await auth();
    const organizationId = session?.user.organizationId;

    if (!organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED.message,
      };
    }

    try {
      const existingPolicy = await db.organizationPolicy.findUnique({
        where: {
          id: policyId,
          organizationId,
        },
      });

      if (!existingPolicy) {
        return {
          success: false,
          error: appErrors.NOT_FOUND.message,
        };
      }

      const updateData: Record<string, any> = {};

      if (content !== undefined) {
        console.log("CONTENT TYPE:", typeof content);

        if (typeof content === "object" && content !== null) {
          if (
            "type" in content &&
            content.type === "doc" &&
            "content" in content &&
            Array.isArray(content.content)
          ) {
            updateData.content = content.content;
            console.log("Extracted content array from TipTap doc");
          } else if (Array.isArray(content)) {
            updateData.content = content;
          } else {
            console.log("Unknown content format - using as is");
            updateData.content = content;
          }
        } else {
          updateData.content = content;
        }
      }

      if (status) {
        updateData.status = status;
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          data: { id: policyId, status: existingPolicy.status },
        };
      }

      const updatedPolicy = await db.organizationPolicy.update({
        where: {
          id: policyId,
        },
        data: updateData,
        select: {
          id: true,
          status: true,
        },
      });

      return {
        success: true,
        data: updatedPolicy,
      };
    } catch (error) {
      console.error("Error updating policy:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
