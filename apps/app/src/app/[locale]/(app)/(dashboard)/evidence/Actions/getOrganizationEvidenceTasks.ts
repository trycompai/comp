"use server";

import { authActionClient } from "@/actions/safe-action";
import { db, Frequency, Departments } from "@bubba/db";
import type { Prisma, OrganizationEvidence } from "@bubba/db";
import { z } from "zod";

// Define the response types for better type safety
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface EvidenceTasksData {
  data: OrganizationEvidence[];
  pagination: PaginationMetadata;
}

export const getOrganizationEvidenceTasks = authActionClient
  .schema(
    z.object({
      search: z.string().optional().nullable(),
      status: z.enum(["published", "draft"]).optional().nullable(),
      frequency: z.nativeEnum(Frequency).optional().nullable(),
      department: z.nativeEnum(Departments).optional().nullable(),
      assigneeId: z.string().optional().nullable(),
      page: z.number().int().positive().optional().default(1),
      pageSize: z.number().int().positive().optional().default(10),
    })
  )
  .metadata({
    name: "getOrganizationEvidenceTasks",
    track: {
      event: "get-organization-evidence-tasks",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const {
      search,
      status,
      frequency,
      department,
      assigneeId,
      page,
      pageSize,
    } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Create the where clause for both count and data queries
      const whereClause: Prisma.OrganizationEvidenceWhereInput = {
        organizationId: user.organizationId,
        // Status filter
        ...(status === "published" ? { published: true } : {}),
        ...(status === "draft" ? { published: false } : {}),
        // Frequency filter
        ...(frequency ? { frequency } : {}),
        // Department filter
        ...(department ? { department } : {}),
        // Assignee filter
        ...(assigneeId ? { assigneeId } : {}),
        // Search filter
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive" as Prisma.QueryMode,
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: "insensitive" as Prisma.QueryMode,
                  },
                },
                {
                  evidence: {
                    name: {
                      contains: search,
                      mode: "insensitive" as Prisma.QueryMode,
                    },
                  },
                },
              ],
            }
          : {}),
      };

      // Get total count for pagination
      const totalCount = await db.organizationEvidence.count({
        where: whereClause,
      });

      // Calculate pagination values
      const skip = (page - 1) * pageSize;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data
      const evidenceTasks = await db.organizationEvidence.findMany({
        where: whereClause,
        include: {
          evidence: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: {
          updatedAt: "desc", // Most recently updated first
        },
      });

      return {
        success: true,
        data: {
          data: evidenceTasks,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching evidence tasks:", error);
      return {
        success: false,
        error: "Failed to fetch evidence tasks",
      };
    }
  });
