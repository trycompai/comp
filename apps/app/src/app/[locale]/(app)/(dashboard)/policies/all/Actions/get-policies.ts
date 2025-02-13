"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

const schema = z.object({
  page: z.number().default(1),
  perPage: z.number().default(10),
});

export const getPolicies = authActionClient
  .schema(schema)
  .metadata({
    name: "get-policies",
    track: {
      event: "get-policies",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { user } = ctx;
      const { page, perPage } = parsedInput;

      if (!user.organizationId) {
        return {
          success: false,
          error: "User does not have an organization",
        };
      }

      const [organizationPolicies, total] = await Promise.all([
        db.organizationPolicy.findMany({
          where: {
            organizationId: user.organizationId,
          },
          include: {
            policy: true,
          },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        db.organizationPolicy.count({
          where: {
            organizationId: user.organizationId,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          items: organizationPolicies,
          total,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch policies",
      };
    }
  });
