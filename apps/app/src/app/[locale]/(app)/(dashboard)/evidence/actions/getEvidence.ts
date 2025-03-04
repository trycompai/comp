"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

export const getEvidence = authActionClient
  .schema(
    z.object({
      evidenceId: z.string(),
    }),
  )
  .metadata({
    name: "getEvidence",
    track: {
      event: "get-evidence",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { evidenceId } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      const evidence = await db.organizationEvidence.findFirst({
        where: {
          id: evidenceId,
        },
      });

      if (!evidence) {
        return {
          success: false,
          error: "Evidence not found",
        };
      }

      return {
        success: true,
        data: evidence,
      };
    } catch (error) {
      console.error("Error fetching evidence:", error);
      return {
        success: false,
        error: "Failed to fetch evidence",
      };
    }
  });
