"use server";

import { db } from "@bubba/db";
import { authActionClient } from "../safe-action";
import type {
  Framework,
  OrganizationControl,
  OrganizationFramework,
} from "@bubba/db";
import { z } from "zod";
import type { ActionData } from "../types";

type FrameworkWithControls = OrganizationFramework & {
  organizationControl: OrganizationControl[];
  framework: Framework;
};

export interface FrameworksResponse {
  frameworks: FrameworkWithControls[];
  availableFrameworks: Framework[];
}

export const getFrameworksAction = authActionClient
  .schema(z.void())
  .metadata({
    name: "getFrameworks",
    track: {
      event: "get-frameworks",
      channel: "server",
    },
  })
  .action(async ({ ctx }): Promise<ActionData<FrameworksResponse>> => {
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        error: "Not authorized - no organization found",
      };
    }

    try {
      const [frameworks, availableFrameworks] = await Promise.all([
        db.organizationFramework.findMany({
          where: { organizationId: user.organizationId },
          include: {
            organizationControl: true,
            framework: true,
          },
        }),
        db.framework.findMany(),
      ]);

      return {
        data: { frameworks, availableFrameworks },
      };
    } catch (error) {
      console.error("Error fetching frameworks:", error);
      return {
        error: "Failed to fetch frameworks",
      };
    }
  });
