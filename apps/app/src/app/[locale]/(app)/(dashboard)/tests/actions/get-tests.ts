"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { z } from "zod";

const testsInputSchema = z.object({
  search: z.string().optional(),
  provider: z.enum(["AWS", "AZURE", "GCP"]).optional(),
  status: z.string().optional(),
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

      const [tests, total] = await Promise.all([
        db.cloudTest.findMany({
          where: {
            organizationId: user.organizationId,
            AND: [
              search
                ? {
                    OR: [
                      { title: { contains: search, mode: "insensitive" } },
                      { description: { contains: search, mode: "insensitive" } },
                    ],
                  }
                : {},
              provider ? { provider } : {},
              status ? { status } : {},
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            provider: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                createdAt: true,
                status: true,
                result: true,
              },
            },
          },
          skip,
          take: per_page,
          orderBy: { updatedAt: 'desc' },
        }),
        db.cloudTest.count({
          where: {
            organizationId: user.organizationId,
            AND: [
              search
                ? {
                    OR: [
                      { title: { contains: search, mode: "insensitive" } },
                      { description: { contains: search, mode: "insensitive" } },
                    ],
                  }
                : {},
              provider ? { provider } : {},
              status ? { status } : {},
            ],
          },
        }),
      ]);

      // Transform the data to include lastRun info
      const transformedTests = tests.map(test => ({
        ...test,
        lastRun: test.runs[0]?.createdAt || null,
        lastRunStatus: test.runs[0]?.status || null,
        lastRunResult: test.runs[0]?.result || null,
        runs: undefined, // Remove the runs array from the response
      }));

      return {
        success: true,
        data: { tests: transformedTests, total },
      };
    } catch (error) {
      console.error("Error fetching tests:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  });
