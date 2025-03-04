"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

export const getOrganizationControl = authActionClient
  .schema(z.object({ controlId: z.string() }))
  .metadata({
    name: "getOrganizationControl",
    track: {
      event: "get-organization-control",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { controlId } = parsedInput;

    if (!user.organizationId) {
      return {
        error: "Not authorized - no organization found",
      };
    }

    try {
      const organizationControl = await db.organizationControl.findUnique({
        where: {
          organizationId: user.organizationId,
          id: controlId,
        },
        include: {
          control: true,
          OrganizationControlRequirement: {
            include: {
              organizationPolicy: true,
              organizationEvidence: true,
            },
          },
        },
      });

      if (!organizationControl) {
        return {
          error: "Organization control not found",
        };
      }

      return {
        data: {
          organizationControl,
        },
      };
    } catch (error) {
      console.error("Error fetching organization control:", error);
      return {
        error: "Failed to fetch organization control",
      };
    }
  });
