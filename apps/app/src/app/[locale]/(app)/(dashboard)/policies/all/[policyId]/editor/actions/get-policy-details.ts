"use server";

import { authActionClient } from "@/actions/safe-action";
import { auth } from "@/auth";
import { db } from "@bubba/db";
import { appErrors, policyDetailsInputSchema } from "../types";

export const getPolicyDetails = authActionClient
  .schema(policyDetailsInputSchema)
  .metadata({
    name: "get-policy-details",
    track: {
      event: "get-policy-details",
      channel: "server",
    },
  })
  .action(async ({ parsedInput }) => {
    const { policyId } = parsedInput;

    const session = await auth();
    const organizationId = session?.user.organizationId;

    if (!organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED.message,
      };
    }

    try {
      const policy = await db.organizationPolicy.findUnique({
        where: {
          id: policyId,
          organizationId,
        },
        select: {
          id: true,
          status: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          policy: {
            select: {
              id: true,
              name: true,
              description: true,
              slug: true,
            },
          },
        },
      });

      if (!policy) {
        return {
          success: false,
          error: appErrors.NOT_FOUND.message,
        };
      }

      return {
        success: true,
        data: policy,
      };
    } catch (error) {
      console.error("Error fetching policy details:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
