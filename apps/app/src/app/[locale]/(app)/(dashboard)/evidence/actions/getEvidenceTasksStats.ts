"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import type { Prisma } from "@bubba/db";
import { z } from "zod";

// Define the response types for better type safety
export interface EvidenceTasksStats {
  totalCount: number;
  emptyCount: number;
  draftCount: number;
  needsReviewCount: number;
  upToDateCount: number;
}

export const getEvidenceTasksStats = authActionClient
  .schema(z.object({}))
  .metadata({
    name: "getEvidenceTasksStats",
    track: {
      event: "get-evidence-tasks-stats",
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
      // Get all evidence tasks for the organization
      const evidenceTasks = await db.organizationEvidence.findMany({
        where: {
          organizationId: user.organizationId,
        },
        select: {
          fileUrls: true,
          additionalUrls: true,
          published: true,
          lastPublishedAt: true,
          frequency: true,
        },
      });

      // Calculate statistics
      let emptyCount = 0;
      let draftCount = 0;
      let needsReviewCount = 0;
      let upToDateCount = 0;
      const totalCount = evidenceTasks.length;
      const now = new Date();

      for (const task of evidenceTasks) {
        // Check if task has files or links
        const hasContent =
          task.fileUrls.length > 0 || task.additionalUrls.length > 0;

        // Check if task is published
        const isPublished = task.published;

        // Check if task needs review (published and next review date is in the past)
        let nextReviewDate = null;

        if (task.lastPublishedAt && task.frequency) {
          // Calculate next review date based on last published date and frequency
          const lastPublished = new Date(task.lastPublishedAt);
          nextReviewDate = new Date(lastPublished);

          switch (task.frequency) {
            case "monthly":
              nextReviewDate.setMonth(nextReviewDate.getMonth() + 1);
              break;
            case "quarterly":
              nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
              break;
            case "yearly":
              nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
              break;
          }
        }

        const isPastDue = nextReviewDate && nextReviewDate < now;

        if (isPublished) {
          upToDateCount++;
        }

        if (!hasContent && !isPublished) {
          // No files or links
          emptyCount++;
        } else if (!isPublished) {
          // Has content but not published
          draftCount++;
        } else if (isPastDue) {
          // Published but needs review
          needsReviewCount++;
        }
      }

      return {
        success: true,
        data: {
          totalCount,
          emptyCount,
          draftCount,
          needsReviewCount,
          upToDateCount,
        },
      };
    } catch (error) {
      console.error("Error fetching evidence tasks stats:", error);
      return {
        success: false,
        error: "Failed to fetch evidence tasks stats",
      };
    }
  });
