"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import type {
  Framework,
  OrganizationControl,
  OrganizationFramework,
} from "@bubba/db";
import { z } from "zod";

export type FrameworkWithControls = OrganizationFramework & {
  organizationControl: OrganizationControl[];
  framework: Framework;
};

export interface FrameworksResponse {
  frameworks: FrameworkWithControls[];
  availableFrameworks: Framework[];
}

export const getOrganizationFramework = authActionClient
  .schema(z.object({ frameworkId: z.string() }))
  .metadata({
    name: "getOrganizationFramework",
    track: {
      event: "get-organization-framework",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { frameworkId } = parsedInput;

    if (!user.organizationId) {
      return {
        error: "Not authorized - no organization found",
      };
    }

    try {
      const framework = await db.organizationFramework.findUnique({
        where: {
          organizationId_frameworkId: {
            organizationId: user.organizationId,
            frameworkId: frameworkId,
          },
        },
        include: {
          framework: true,
          organizationControl: true,
        },
      });

      if (!framework) {
        return {
          error: "Framework not found",
        };
      }

      return {
        data: framework,
      };
    } catch (error) {
      console.error("Error fetching framework:", error);
      return {
        error: "Failed to fetch framework",
      };
    }
  });
