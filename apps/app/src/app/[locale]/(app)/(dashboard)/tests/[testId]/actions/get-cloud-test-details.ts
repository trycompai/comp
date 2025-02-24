"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { auth } from "@/auth";
import { 
  appErrors, 
  type CloudTestResult,
  type ActionResponse 
} from "./types";

export async function getCloudTestDetails(input: { testId: string }): Promise<ActionResponse<CloudTestResult>> {
  const { testId } = input;

  const session = await auth();
  const organizationId = session?.user.organizationId;

  if (!organizationId) {
    throw new Error("Organization ID not found");
  }

  try {
    const cloudTest = await db.cloudTest.findUnique({
      where: {
        id: testId,
        organizationId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        provider: true,
        status: true,
        config: true,
        authConfig: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        runs: {
          select: {
            id: true,
            status: true,
            result: true,
            resultDetails: true,
            startedAt: true,
            completedAt: true,
            executedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Limit to most recent 10 runs
        },
      },
    });

    if (!cloudTest) {
      return {
        success: false,
        error: appErrors.NOT_FOUND,
      };
    }

    return {
      success: true,
      data: cloudTest,
    };
  } catch (error) {
    console.error("Error fetching cloud test details:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
} 