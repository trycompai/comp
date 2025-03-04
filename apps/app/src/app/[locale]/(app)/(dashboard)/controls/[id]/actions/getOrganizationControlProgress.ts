"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

export interface ControlProgressResponse {
  total: number;
  completed: number;
  progress: number;
  byType: {
    [key: string]: {
      total: number;
      completed: number;
    };
  };
}

export const getOrganizationControlProgress = authActionClient
  .schema(z.object({ controlId: z.string() }))
  .metadata({
    name: "getOrganizationControlProgress",
    track: {
      event: "get-organization-control-progress",
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
      const requirements = await db.organizationControlRequirement.findMany({
        where: {
          organizationControlId: controlId,
        },
        include: {
          organizationPolicy: true,
          organizationEvidence: true,
        },
      });

      const progress: ControlProgressResponse = {
        total: requirements.length,
        completed: 0,
        progress: 0,
        byType: {},
      };

      for (const requirement of requirements) {
        // Initialize type counters if not exists
        if (!progress.byType[requirement.type]) {
          progress.byType[requirement.type] = {
            total: 0,
            completed: 0,
          };
        }

        progress.byType[requirement.type].total++;

        // Check completion based on requirement type
        let isCompleted = false;
        switch (requirement.type) {
          case "policy":
            isCompleted =
              requirement.organizationPolicy?.status === "published";
            break;
          case "file":
            isCompleted = !!requirement.fileUrl;
            break;
          case "evidence":
            isCompleted = requirement.organizationEvidence?.published === true;
            break;
          default:
            isCompleted = requirement.published;
        }

        if (isCompleted) {
          progress.completed++;
          progress.byType[requirement.type].completed++;
        }
      }

      // Calculate overall progress percentage
      progress.progress =
        progress.total > 0
          ? Math.round((progress.completed / progress.total) * 100)
          : 0;

      return {
        data: {
          progress,
        },
      };
    } catch (error) {
      console.error("Error fetching control progress:", error);
      return {
        error: "Failed to fetch control progress",
      };
    }
  });
