"use server";

import { authActionClient } from "@/actions/safe-action";
import { z } from "zod";
import { db } from "@bubba/db";

const revokeApiKeySchema = z.object({
  id: z.string().min(1),
});

export const revokeApiKeyAction = authActionClient
  .schema(revokeApiKeySchema)
  .metadata({
    name: "revokeApiKey",
    track: {
      event: "revokeApiKey",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { id } = parsedInput;

      // Update the API key to set isActive to false
      const result = await db.organizationApiKey.updateMany({
        where: {
          id,
          organizationId: ctx.user.organizationId!,
        },
        data: {
          isActive: false,
        },
      });

      if (result.count === 0) {
        return {
          success: false,
          error: "API key not found or not authorized to revoke",
        };
      }

      return {
        success: true,
        message: "API key revoked successfully",
      };
    } catch (error) {
      console.error("Error revoking API key:", error);
      return {
        success: false,
        error: "An error occurred while revoking the API key",
      };
    }
  });
