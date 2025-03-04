"use server";

import { authActionClient } from "@/actions/safe-action";
import { db, Frequency } from "@bubba/db";
import { z } from "zod";
import type { ActionResponse } from "@/actions/types";

const schema = z.object({
  id: z.string(),
  frequency: z.nativeEnum(Frequency).nullable(),
});

export const updateEvidenceFrequency = authActionClient
  .schema(schema)
  .metadata({
    name: "updateEvidenceFrequency",
    track: {
      event: "update-evidence-frequency",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }): Promise<ActionResponse> => {
    const { user } = ctx;
    const { id, frequency } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Check if the evidence exists and belongs to the user's organization
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

      // Update the evidence frequency
      const updatedEvidence = await db.organizationEvidence.update({
        where: {
          id,
        },
        data: {
          frequency,
        },
      });

      return {
        success: true,
        data: updatedEvidence,
      };
    } catch (error) {
      console.error("Error updating evidence frequency:", error);
      return {
        success: false,
        error: "Failed to update evidence frequency",
      };
    }
  });
