"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { testsInputSchema } from "../types";

export const getTests = authActionClient
  .schema(testsInputSchema)
  .metadata({
    name: "get-tests",
    track: {
      event: "get-tests",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { search, provider, status, page = 1, per_page = 10 } = parsedInput;
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        success: false,
        error: "You are not authorized to view tests",
      };
    }

    try {
      const skip = (page - 1) * per_page;

      // Use the prisma client with correct model
      const [integrationResults, total] = await Promise.all([
        db.organizationIntegrationResults.findMany({
          where: {
            organizationId: user.organizationId,
            ...(search ? {
              OR: [
                {
                  organizationIntegration: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  resultDetails: {
                    path: ["Title"],
                    string_contains: search,
                  },
                },
              ],
            } : {}),
            ...(provider ? {
              organizationIntegration: {
                integration_id: provider,
              },
            } : {}),
            ...(status ? { label: status } : {}),
          },
          include: {
            organizationIntegration: {
              select: {
                id: true,
                name: true,
                integration_id: true,
              },
            },
          },
          skip,
          take: per_page,
          orderBy: { completedAt: "desc" },
        }),
        db.organizationIntegrationResults.count({
          where: {
            organizationId: user.organizationId,
            ...(search ? {
              OR: [
                {
                  organizationIntegration: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  resultDetails: {
                    path: ["description"],
                    string_contains: search,
                  },
                },
              ],
            } : {}),
            ...(provider ? {
              organizationIntegration: {
                integration_id: provider,
              },
            } : {}),
            ...(status ? { label: status } : {}),
          },
        }),
      ]);

      // Transform the data to include integration info
      const transformedTests = integrationResults.map((result: any) => {
        return {
          id: result.id,
          severity: result.label,
          result: result.status,
          title: result.title || result.organizationIntegration.name,
          provider: result.organizationIntegration.integration_id,
          createdAt: result.completedAt || new Date(),
          // The executedBy information is no longer available in the new schema
          assignedUser: null,
        };
      });

      return {
        success: true,
        data: { tests: transformedTests, total },
      };
    } catch (error) {
      console.error("Error fetching integration results:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  });
