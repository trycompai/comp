"use server";

import { authActionClient } from "@/actions/safe-action";
import { type OrganizationPolicy, db } from "@bubba/db";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
});

export type PublishPolicyResponse = {
  success: boolean;
  data?: OrganizationPolicy;
  error?: string;
};

export const publishPolicy = authActionClient
  .schema(schema)
  .metadata({
    name: "publish-policy",
    track: {
      event: "publish-policy",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { id } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      const policy = await db.organizationPolicy.update({
        where: {
          id,
          organizationId: user.organizationId!,
        },
        data: {
          status: "published",
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: policy,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to publish policy",
      };
    }
  });
