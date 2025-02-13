"use server";

import { authActionClient } from "@/actions/safe-action";
import { db, type OrganizationPolicy } from "@bubba/db";
import { z } from "zod";

const schema = z.object({});

export type PolicyStatsResponse = {
  success: boolean;
  data?: OrganizationPolicy[];
  error?: string;
};

export const getPolicies = authActionClient
  .schema(schema)
  .metadata({
    name: "get-policies",
    track: {
      event: "get-policies",
      channel: "server",
    },
  })
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      const policies = await db.organizationPolicy.findMany({
        where: {
          organizationId: user.organizationId!,
        },
        include: {
          policy: true,
        },
      });

      return {
        success: true,
        data: policies,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch policy statistics",
      };
    }
  });
