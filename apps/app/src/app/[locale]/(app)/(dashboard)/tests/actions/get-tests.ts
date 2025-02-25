"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { z } from "zod";
import { TestRunStatus } from "@bubba/db";

const testsInputSchema = z.object({
  search: z.string().optional(),
  provider: z.enum(["AWS", "AZURE", "GCP"]).optional(),
  status: z.nativeEnum(TestRunStatus).optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

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

      const [integrationRuns, total] = await Promise.all([
        db.organizationIntegrationRun.findMany({
          where: {
            organizationId: user.organizationId,
            AND: [
              search
                ? {
                    OR: [
                      { 
                        organizationIntegration: {
                          name: { contains: search, mode: "insensitive" }
                        }
                      },
                      { 
                        resultDetails: { 
                          path: ["description"], 
                          string_contains: search 
                        } 
                      },
                    ],
                  }
                : {},
              provider 
                ? { 
                    organizationIntegration: { 
                      integration_id: provider 
                    } 
                  } 
                : {},
              status 
                ? { status: status } 
                : {},
            ],
          },
          include: {
            organizationIntegration: {
              select: {
                id: true,
                name: true,
                integration_id: true,
              },
            },
            executedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          skip,
          take: per_page,
          orderBy: { updatedAt: 'desc' },
        }),
        db.organizationIntegrationRun.count({
          where: {
            organizationId: user.organizationId,
            AND: [
              search
                ? {
                    OR: [
                      { 
                        organizationIntegration: {
                          name: { contains: search, mode: "insensitive" }
                        }
                      },
                      { 
                        resultDetails: { 
                          path: ["description"], 
                          string_contains: search 
                        } 
                      },
                    ],
                  }
                : {},
              provider 
                ? { 
                    organizationIntegration: { 
                      integration_id: provider 
                    } 
                  } 
                : {},
              status 
                ? { status: status } 
                : {},
            ],
          },
        }),
      ]);

      // Transform the data to include integration info
      const transformedTests = integrationRuns.map((run) => {
        const description = typeof run.resultDetails === 'object' && run.resultDetails 
          ? (run.resultDetails as any).description || "" 
          : "";
          
        return {
          id: run.id,
          title: run.organizationIntegration.name,
          description,
          provider: run.organizationIntegration.integration_id,
          status: run.status,
          result: run.result,
          lastRun: run.startedAt,
          lastRunStatus: run.status,
          lastRunResult: run.result,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          executedBy: {
            id: run.executedBy.id,
            name: run.executedBy.name,
            email: run.executedBy.email,
          },
        };
      });

      return {
        success: true,
        data: { tests: transformedTests, total },
      };
    } catch (error) {
      console.error("Error fetching integration runs:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  });
