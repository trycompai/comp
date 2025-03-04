"use server";

import { authActionClient } from "@/actions/safe-action";
import type {
  ControlRequirement,
  OrganizationControlRequirement,
  Policy,
} from "@bubba/db";
import { db } from "@bubba/db";
import { z } from "zod";

export const getOrganizationControlRequirements = authActionClient
  .schema(z.object({ controlId: z.string() }))
  .metadata({
    name: "getOrganizationControlRequirements",
    track: {
      event: "get-organization-control-requirements",
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
      const organizationControlRequirements =
        await db.organizationControlRequirement.findMany({
          where: {
            organizationControlId: controlId,
          },
          include: {
            organizationControl: {
              include: {
                control: true,
              },
            },
            controlRequirement: {
              include: {
                evidence: true,
              },
            },
            organizationPolicy: {
              include: {
                policy: true,
              },
            },
            organizationEvidence: true,
          },
        });

      if (!organizationControlRequirements) {
        return {
          error: "Organization control requirements not found",
        };
      }

      return {
        data: {
          organizationControlRequirements,
        },
      };
    } catch (error) {
      console.error("Error fetching organization control:", error);
      return {
        error: "Failed to fetch organization control",
      };
    }
  });
