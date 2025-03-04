"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";
import type { ActionResponse } from "@/actions/types";

export const toggleRelevance = authActionClient
  .schema(
    z.object({
      id: z.string(),
      isNotRelevant: z.boolean(),
    }),
  )
  .metadata({
    name: "toggleRelevance",
    track: {
      event: "toggle-evidence-relevance",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { id, isNotRelevant } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Check if the evidence exists
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

      // Update the evidence with the new relevance status
      // If marking as not relevant, also unpublish it
      const updatedEvidence = await db.organizationEvidence.update({
        where: {
          id,
          organizationId: user.organizationId,
        },
        data: {
          isNotRelevant,
          // If marking as not relevant, also unpublish it
          ...(isNotRelevant === true && {
            published: false,
            lastPublishedAt: null,
          }),
        },
      });

      return {
        success: true,
        data: updatedEvidence,
      };
    } catch (error) {
      console.error("Error toggling evidence relevance:", error);
      return {
        success: false,
        error: "Failed to update evidence relevance status",
      };
    }
  });
