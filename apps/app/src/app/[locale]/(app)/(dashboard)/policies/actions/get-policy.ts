"use server";

import { authActionClient } from "@/actions/safe-action";
import { db, type OrganizationPolicy } from "@bubba/db";
import { z } from "zod";

const schema = z.object({
  policyId: z.string(),
});

export type PolicyStatsResponse = {
  success: boolean;
  data?: OrganizationPolicy[];
  error?: string;
};

export const getPolicy = authActionClient
  .schema(schema)
  .metadata({
    name: "get-policy",
    track: {
      event: "get-policy",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { policyId } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      const policy = await db.organizationPolicy.findFirst({
        where: {
          organizationId: user.organizationId!,
          id: policyId,
        },
        include: {
          policy: true,
        },
      });

      return {
        success: true,
        data: policy,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch policy statistics",
      };
    }
  });
