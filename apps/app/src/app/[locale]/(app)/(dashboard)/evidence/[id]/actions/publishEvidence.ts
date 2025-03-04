"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
});

interface SuccessResponse {
  success: true;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ActionResponse = SuccessResponse | ErrorResponse;

export const publishEvidence = authActionClient
  .schema(schema)
  .metadata({
    name: "publishEvidence",
    track: {
      event: "publish-evidence",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse> => {
    const { user } = ctx;
    const { id } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Check if evidence exists and belongs to organization
      const evidence = await db.organizationEvidence.findFirst({
        where: {
          id,
          organizationId: user.organizationId,
        },
      });

      if (!evidence) {
        return {
          success: false,
          error: "Evidence not found",
        };
      }

      // Update the evidence to mark it as published
      await db.organizationEvidence.update({
        where: { id },
        data: {
          published: true,
          lastPublishedAt: new Date(),
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error publishing evidence:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to publish evidence",
      };
    }
  });
