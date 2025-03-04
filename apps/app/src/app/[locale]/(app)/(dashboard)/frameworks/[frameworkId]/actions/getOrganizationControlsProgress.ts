"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

export interface ControlProgress {
  controlId: string;
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

export const getOrganizationControlsProgress = authActionClient
  .schema(z.object({ controlIds: z.array(z.string()) }))
  .metadata({
    name: "getOrganizationControlsProgress",
    track: {
      event: "get-organization-controls-progress",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { controlIds } = parsedInput;

    if (!user.organizationId) {
      return {
        error: "Not authorized - no organization found",
      };
    }

    try {
      const requirements = await db.organizationControlRequirement.findMany({
        where: {
          organizationControlId: {
            in: controlIds,
          },
        },
        include: {
          organizationPolicy: true,
        },
      });

      const progressByControl = new Map<string, ControlProgress>();

      // Initialize progress for all controls
      for (const controlId of controlIds) {
        progressByControl.set(controlId, {
          controlId,
          total: 0,
          completed: 0,
          progress: 0,
          byType: {},
        });
      }

      // Calculate progress for each control
      for (const requirement of requirements) {
        const controlId = requirement.organizationControlId;
        const progress = progressByControl.get(controlId)!;

        // Initialize type counters if not exists
        if (!progress.byType[requirement.type]) {
          progress.byType[requirement.type] = {
            total: 0,
            completed: 0,
          };
        }

        progress.total++;
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
            isCompleted = !!requirement.content;
            break;
          default:
            isCompleted = requirement.published;
        }

        if (isCompleted) {
          progress.completed++;
          progress.byType[requirement.type].completed++;
        }
      }

      // Calculate progress percentage for each control
      for (const progress of progressByControl.values()) {
        progress.progress =
          progress.total > 0
            ? Math.round((progress.completed / progress.total) * 100)
            : 0;
      }

      return {
        data: {
          progress: Array.from(progressByControl.values()),
        },
      };
    } catch (error) {
      console.error("Error fetching controls progress:", error);
      return {
        error: "Failed to fetch controls progress",
      };
    }
  });
