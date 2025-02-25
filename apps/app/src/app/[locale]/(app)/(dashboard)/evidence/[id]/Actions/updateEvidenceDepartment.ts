"use server";

import { z } from "zod";
import { db, Departments } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";

const schema = z.object({
  id: z.string(),
  department: z
    .enum([...Object.values(Departments)] as [string, ...string[]])
    .nullable(),
});

export const updateEvidenceDepartment = authActionClient
  .schema(schema)
  .metadata({
    name: "Update Evidence Department",
    track: {
      event: "update-evidence-department",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { id, department } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      const evidence = await db.organizationEvidence.findUnique({
        where: { id },
        select: { organizationId: true },
      });

      if (!evidence) {
        return {
          success: false,
          error: "Evidence not found",
        };
      }

      // Verify the user has access to this organization's evidence
      if (evidence.organizationId !== user.organizationId) {
        return {
          success: false,
          error: "Not authorized to update this evidence",
        };
      }

      // Update the evidence with the new department
      await db.organizationEvidence.update({
        where: { id },
        data: {
          department: department as Departments | null,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to update evidence department:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  });
